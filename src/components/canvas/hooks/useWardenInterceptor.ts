import { useRef, useCallback, useEffect } from 'react';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { WardenIPC } from '@services/rust-bridge/wardenIpc';
import { useEditorStore } from '@core/state/editorStore';
import { useWardenStore } from '@core/state/wardenStore';
import { ErrorLevel } from '@core/contracts/WardenSchema';

/**
 * Custom hook encapsulating the Warden Heuristic Engine's frontend logic.
 * Manages Monaco decoration caching, streams, and translates backend analysis 
 * into native visual editor markers (squiggly lines).
 */
export const useWardenInterceptor = () => {
    const { activeFilePath } = useEditorStore();
    
    // We now subscribe to activeAnalysis to drive visual editor feedback
    const { isStreaming, streamingBuffer, latestChunk, activeAnalysis } = useWardenStore();
    
    const activePathRef = useRef<string | null>(null);
    activePathRef.current = activeFilePath;

    // Stream Context Lock
    const streamContextPathRef = useRef<string | null>(null);

    const editorInstanceRef = useRef<any>(null);
    const monacoInstanceRef = useRef<any>(null);
    const decorationsCollectionRef = useRef<any>(null);

    // Decoration Persistence Cache: Maps filePath -> Range[]
    const fileDecorationsRef = useRef<Map<string, any[]>>(new Map());

    const isAnalysable = (path: string | null): boolean => {
        if (!path) return false;
        const ext = path.split('.').pop()?.toLowerCase();
        return ['ts', 'tsx', 'js', 'jsx', 'rs'].includes(ext || '');
    };

    /**
     * VISUAL LINKING EFFECT: Applies native editor markers based on Rust analysis.
     * Uses Monaco's setModelMarkers to draw squiggly lines without blocking React's thread.
     */
    useEffect(() => {
        const editor = editorInstanceRef.current;
        const monaco = monacoInstanceRef.current;

        if (!editor || !monaco) return;

        try {
            const model = editor.getModel();
            if (!model) return;

            // Clear markers if analysis is null, clean, or target path does not match active view
            if (!activeAnalysis || activeAnalysis.cards.length === 0 || activeAnalysis.target_file_path !== activePathRef.current) {
                monaco.editor.setModelMarkers(model, 'warden-heuristics', []);
                return;
            }

            // Map Warden LinterCards to standard IDE MarkerData
            const markers = activeAnalysis.cards.map(card => {
                let severity = monaco.MarkerSeverity.Info;
                if (card.level === ErrorLevel.Critical) severity = monaco.MarkerSeverity.Error;
                else if (card.level === ErrorLevel.Warning) severity = monaco.MarkerSeverity.Warning;

                // Format the hover tooltip to include the rule and suggested fix
                const message = `[Warden: ${card.rule_triggered}]\n${card.message}${card.suggested_fix ? `\n\nSuggested Fix: ${card.suggested_fix}` : ''}`;

                return {
                    severity,
                    startLineNumber: card.line_start,
                    startColumn: 1, // Draw squiggly from the start of the line
                    endLineNumber: card.line_end,
                    endColumn: model.getLineMaxColumn(card.line_end), // to the absolute end of the line
                    message,
                };
            });

            // Apply markers to the specific model layer
            monaco.editor.setModelMarkers(model, 'warden-heuristics', markers);
            SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', `Applied ${markers.length} visual markers to editor.`);

        } catch (err) {
            SystemLogger.log(LogLevel.ERROR, 'WardenInterceptor', 'Failed to apply visual markers.', err);
        }
    }, [activeAnalysis]);

    /**
     * STREAMING EFFECT: Handles incoming AI code tokens.
     */
    useEffect(() => {
        const editor = editorInstanceRef.current;
        const monaco = monacoInstanceRef.current;

        if (!editor || !monaco || !isStreaming || !latestChunk) return;

        if (!streamContextPathRef.current) {
            streamContextPathRef.current = activeFilePath;
        }

        try {
            const model = editor.getModel();
            const lineCount = model.getLineCount();
            const column = model.getLineMaxColumn(lineCount);
            const range = new monaco.Range(lineCount, column, lineCount, column);

            editor.executeEdits('warden-stream', [{
                range,
                text: latestChunk,
                forceMoveMarkers: true
            }]);

            editor.revealLine(lineCount);
        } catch (err) {
            SystemLogger.log(LogLevel.ERROR, 'WardenInterceptor', 'Stream insertion failed.', err);
        }
    }, [latestChunk, isStreaming, activeFilePath]);

    /**
     * FINALIZATION EFFECT: Dispatches analysis request when a stream completes.
     */
    useEffect(() => {
        const targetPath = streamContextPathRef.current;

        if (!isStreaming && streamingBuffer.length > 0 && targetPath && isAnalysable(targetPath)) {
            SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', `AI Stream finished. Analyzing block for: ${targetPath}`);
            
            const editor = editorInstanceRef.current;
            if (editor) {
                WardenIPC.analyzeSelection(targetPath, editor.getValue(), streamingBuffer, 1);
            }

            streamContextPathRef.current = null;
        }
    }, [isStreaming, streamingBuffer]);

    const bindWardenHeuristics = useCallback((editor: any, monaco: any) => {
        editorInstanceRef.current = editor;
        monacoInstanceRef.current = monaco;
        decorationsCollectionRef.current = editor.createDecorationsCollection();

        // 1. LIFECYCLE SYNC: Restore highlights on tab switch
        editor.onDidChangeModel(() => {
            const path = activePathRef.current;
            if (!path) return;
            const savedRanges = fileDecorationsRef.current.get(path) || [];
            
            decorationsCollectionRef.current.set(savedRanges.map((range: any) => ({
                range,
                options: {
                    isWholeLine: true,
                    className: 'warden-paste-highlight',
                    description: 'Unchecked content',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            })));
        });

        // 2. CORE HEURISTICS: Flag manual pastes and dispatch to the Rust backend
        editor.onDidPaste((e: any) => {
            const path = activePathRef.current;
            if (!path) return;

            SystemLogger.log(LogLevel.INFO, 'WardenEngine', 'Paste event detected.');
            
            decorationsCollectionRef.current.append([{
                range: e.range,
                options: {
                    isWholeLine: true,
                    className: 'warden-paste-highlight',
                    description: 'Unchecked paste block',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            }]);

            fileDecorationsRef.current.set(path, decorationsCollectionRef.current.getRanges());
            
            if (isAnalysable(path)) {
                WardenIPC.analyzeSelection(
                    path,
                    editor.getValue(),
                    editor.getModel().getValueInRange(e.range),
                    e.range.startLineNumber
                );
            }
        });

        // 3. EVENT LISTENER: Clean up visual decorations if code is deleted
        editor.onDidChangeModelContent(() => {
            try {
                const ranges = decorationsCollectionRef.current.getRanges();
                if (!ranges || ranges.length === 0) {
                    if (activePathRef.current) fileDecorationsRef.current.set(activePathRef.current, []);
                    return;
                }

                const validRanges = ranges.filter((r: any) => !r.isEmpty());

                if (validRanges.length !== ranges.length) {
                    decorationsCollectionRef.current.set(validRanges.map((range: any) => ({
                        range,
                        options: {
                            isWholeLine: true,
                            className: 'warden-paste-highlight',
                            description: 'Unchecked content',
                            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                        }
                    })));
                }

                if (activePathRef.current) {
                    fileDecorationsRef.current.set(activePathRef.current, validRanges);
                }
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'WardenInterceptor', 'Decoration cleanup failure.', err);
            }
        });

    }, []);

    return { bindWardenHeuristics };
};