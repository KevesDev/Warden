import { useRef, useCallback, useEffect } from 'react';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { WardenIPC } from '@services/rust-bridge/wardenIpc';
import { useEditorStore } from '@core/state/editorStore';
import { useWardenStore } from '@core/state/wardenStore';
import { ErrorLevel } from '@core/contracts/WardenSchema';

/**
 * Custom hook encapsulating the Warden Heuristic Engine's frontend logic.
 * Manages Monaco decoration caching and triggers the Rust AST/Linter backend.
 * * * ARCHITECTURAL DESIGN:
 * Uses 'Ref' escape hatches for activePath and monacoInstance to bridge
 * React's declarative state with Monaco's imperative listeners. This prevents
 * stale closures and avoids expensive listener re-binding on every render.
 */
export const useWardenInterceptor = () => {
    const { activeFilePath } = useEditorStore();
    const { 
        isStreaming, 
        streamingBuffer, 
        latestChunk, 
        activeAnalysis, 
        clearAnalysis,
        focusedIssueId 
    } = useWardenStore();
    
    const activePathRef = useRef<string | null>(null);
    activePathRef.current = activeFilePath;

    // Stream Context Lock: Prevents analysis misattribution if tabs change mid-stream
    const streamContextPathRef = useRef<string | null>(null);
    const streamStartLineRef = useRef<number | null>(null);

    const editorInstanceRef = useRef<any>(null);
    const monacoInstanceRef = useRef<any>(null);
    
    // Decoration Persistence Cache: Maps filePath -> Range[]
    const decorationsCollectionRef = useRef<any>(null);
    const fileDecorationsRef = useRef<Map<string, any[]>>(new Map());

    /**
     * Determines if a file extension warrants heuristic analysis.
     * Prevents false-positives in documentation or non-code files.
     */
    const isAnalysable = (path: string | null): boolean => {
        if (!path) return false;
        const ext = path.split('.').pop()?.toLowerCase();
        return ['ts', 'tsx', 'js', 'jsx', 'rs'].includes(ext || '');
    };

    /**
     * NAVIGATION EFFECT: Snaps the editor cursor to the focused Kanban card.
     * Synchronizes with activeFilePath to ensure cross-tab navigation completes first.
     */
    useEffect(() => {
        if (!focusedIssueId || !activeAnalysis) return;

        // Ensure the editor has fully switched to the target file before snapping
        if (activeFilePath !== activeAnalysis.target_file_path) {
            return; 
        }

        const targetCard = activeAnalysis.cards.find(c => c.id === focusedIssueId);
        const editor = editorInstanceRef.current;

        if (targetCard && editor) {
            try {
                SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', `Navigating to issue: ${targetCard.rule_triggered}`);
                
                // We use a micro-delay (50ms) to ensure Monaco's internal model swap 
                // is completely painted to the DOM before forcing a scroll event.
                setTimeout(() => {
                    editor.revealLineInCenter(targetCard.line_start);
                    editor.setPosition({ lineNumber: targetCard.line_start, column: 1 });
                    editor.focus();
                }, 50);

            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'WardenInterceptor', 'Failed to navigate to issue.', err);
            }
        }
    }, [focusedIssueId, activeAnalysis, activeFilePath]);

    /**
     * VISUAL LINKING EFFECT: Applies native editor markers based on Rust analysis.
     */
    useEffect(() => {
        const editor = editorInstanceRef.current;
        const monaco = monacoInstanceRef.current;

        if (!editor || !monaco) return;

        try {
            const model = editor.getModel();
            if (!model) return;

            if (!activeAnalysis || activeAnalysis.cards.length === 0 || activeAnalysis.target_file_path !== activePathRef.current) {
                monaco.editor.setModelMarkers(model, 'warden-heuristics', []);
                return;
            }

            const markers = activeAnalysis.cards.map(card => {
                let severity = monaco.MarkerSeverity.Info;
                if (card.level === ErrorLevel.Critical) severity = monaco.MarkerSeverity.Error;
                else if (card.level === ErrorLevel.Warning) severity = monaco.MarkerSeverity.Warning;

                const message = `[Warden: ${card.rule_triggered}]\n${card.message}${card.suggested_fix ? `\n\nSuggested Fix: ${card.suggested_fix}` : ''}`;

                return {
                    severity,
                    startLineNumber: card.line_start,
                    startColumn: 1, 
                    endLineNumber: card.line_end,
                    endColumn: model.getLineMaxColumn(card.line_end), 
                    message,
                };
            });

            monaco.editor.setModelMarkers(model, 'warden-heuristics', markers);

        } catch (err) {
            SystemLogger.log(LogLevel.ERROR, 'WardenInterceptor', 'Failed to apply visual markers.', err);
        }
    }, [activeAnalysis]);

    /**
     * STREAMING EFFECT: Handles incoming AI code tokens and locks the context.
     */
    useEffect(() => {
        const editor = editorInstanceRef.current;
        const monaco = monacoInstanceRef.current;

        if (!editor || !monaco || !isStreaming || !latestChunk) return;

        try {
            const model = editor.getModel();
            const lineCount = model.getLineCount();

            // Lock context and capture the exact start line of the stream
            if (!streamContextPathRef.current) {
                streamContextPathRef.current = activeFilePath;
                streamStartLineRef.current = lineCount;
            }

            const column = model.getLineMaxColumn(lineCount);
            const range = new monaco.Range(lineCount, column, lineCount, column);

            // executeEdits preserves undo/redo history and marker stability
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
     * FINALIZATION EFFECT: Dispatches analysis request and highlights the stream block.
     * Includes ROBUST LOGGING to catch edge cases where analysis is bypassed.
     */
    useEffect(() => {
        const targetPath = streamContextPathRef.current;

        if (!isStreaming && streamingBuffer.length > 0) {
            const editor = editorInstanceRef.current;
            const monaco = monacoInstanceRef.current;
            const startLine = streamStartLineRef.current;

            if (!targetPath) {
                SystemLogger.log(LogLevel.WARN, 'WardenInterceptor', 'Stream finished but no file was active.');
                clearAnalysis();
            } else if (isAnalysable(targetPath) && editor && monaco && startLine) {
                
                const endLine = editor.getModel().getLineCount();

                // 1. Visually highlight the newly generated block as "Unchecked"
                decorationsCollectionRef.current.append([{
                    range: new monaco.Range(startLine, 1, endLine, 1),
                    options: {
                        isWholeLine: true,
                        className: 'warden-paste-highlight',
                        description: 'Unchecked AI content',
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                }]);

                // Sync the cache so the highlight survives tab switching
                fileDecorationsRef.current.set(targetPath, decorationsCollectionRef.current.getRanges());
                
                // 2. Dispatch to Rust Backend
                WardenIPC.analyzeSelection(targetPath, editor.getValue(), streamingBuffer, startLine);
                
            } else {
                SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', `Analysis skipped for: '${targetPath}'`);
                clearAnalysis();
            }

            // Reset context locks for the next generation
            streamContextPathRef.current = null;
            streamStartLineRef.current = null;
        }
    }, [isStreaming, streamingBuffer, clearAnalysis]);

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

        // 3. EVENT LISTENER: Clean up visual decorations & RESIDUAL SQUIGGLIES if code is deleted
        editor.onDidChangeModelContent(() => {
            try {
                const ranges = decorationsCollectionRef.current.getRanges();
                
                // Check if decorations are entirely gone first.
                if (!ranges || ranges.length === 0) {
                    if (activePathRef.current) {
                        fileDecorationsRef.current.set(activePathRef.current, []);
                    }
                    
                    // If the orange box is completely destroyed, the AI block was wiped.
                    // Clear the global analysis state BEFORE returning to kill the orphaned squigglies.
                    const currentAnalysis = useWardenStore.getState().activeAnalysis;
                    if (currentAnalysis && currentAnalysis.target_file_path === activePathRef.current) {
                        SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', 'Highlight decorations removed. Wiping orphaned analysis markers.');
                        useWardenStore.getState().clearAnalysis();
                    }
                    return;
                }

                // Filter out any ranges that have collapsed to length 0 (meaning the text was deleted)
                const validRanges = ranges.filter((r: any) => !r.isEmpty());

                if (validRanges.length === 0) {
                    SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', 'Generated code deleted. Wiping residual analysis markers.');
                    useWardenStore.getState().clearAnalysis();
                    decorationsCollectionRef.current.clear();
                } else if (validRanges.length !== ranges.length) {
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