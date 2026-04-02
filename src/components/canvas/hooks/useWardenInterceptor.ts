import { useRef, useCallback, useEffect } from 'react';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { WardenIPC } from '@services/rust-bridge/wardenIpc';
import { useEditorStore } from '@core/state/editorStore';
import { useWardenStore } from '@core/state/wardenStore';

/**
 * Custom hook encapsulating the Warden Heuristic Engine's frontend logic.
 * Manages Monaco decoration caching and triggers the Rust AST/Linter backend.
 * * ARCHITECTURAL DESIGN:
 * Uses 'Ref' escape hatches for activePath and monacoInstance to bridge
 * React's declarative state with Monaco's imperative listeners. This prevents
 * stale closures and avoids expensive listener re-binding on every render.
 */
export const useWardenInterceptor = () => {
    const { activeFilePath } = useEditorStore();
    const { isStreaming, streamingBuffer, latestChunk } = useWardenStore();
    
    const activePathRef = useRef<string | null>(null);
    activePathRef.current = activeFilePath;

    const editorInstanceRef = useRef<any>(null);
    const monacoInstanceRef = useRef<any>(null);
    const decorationsCollectionRef = useRef<any>(null);

    // Decoration Persistence Cache: Maps filePath -> Range[]
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
     * EFFECT: Handles incoming AI code streams from the MockService.
     * Appends tokens to the editor buffer via the native Edits API.
     */
    useEffect(() => {
        const editor = editorInstanceRef.current;
        const monaco = monacoInstanceRef.current;

        if (!editor || !monaco || !isStreaming || !latestChunk) return;

        try {
            const model = editor.getModel();
            const lineCount = model.getLineCount();
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
    }, [latestChunk, isStreaming]);

    /**
     * EFFECT: Finalizes analysis when a stream completes.
     */
    useEffect(() => {
        const path = activePathRef.current;
        if (!isStreaming && streamingBuffer.length > 0 && path && isAnalysable(path)) {
            SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', 'AI Stream finished. Analyzing block.');
            
            const editor = editorInstanceRef.current;
            if (!editor) return;

            WardenIPC.analyzeSelection(path, editor.getValue(), streamingBuffer, 1);
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

        // 3. EVENT LISTENER: Clean up decorations if code is deleted
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