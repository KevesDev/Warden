import { useRef, useCallback } from 'react';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { WardenIPC } from '@services/rust-bridge/wardenIpc';
import { useEditorStore } from '@core/state/editorStore';

/**
 * Custom hook encapsulating the Warden Heuristic Engine's frontend logic.
 * Manages Monaco decoration caching across tabs and triggers the Rust AST/Linter backend.
 */
export const useWardenInterceptor = () => {
    const { activeFilePath } = useEditorStore();
    
    // React closure escape hatches for asynchronous Monaco event listeners
    const activePathRef = useRef<string | null>(null);
    activePathRef.current = activeFilePath;

    // Cache mapping file paths to their active Warden highlight ranges
    const fileDecorationsRef = useRef<Map<string, any[]>>(new Map());
    const decorationsCollectionRef = useRef<any>(null);

    const bindWardenHeuristics = useCallback((editor: any, monaco: any) => {
        decorationsCollectionRef.current = editor.createDecorationsCollection();

        // 1. LIFECYCLE SYNC: Restore highlights when returning to an existing tab
        editor.onDidChangeModel(() => {
            if (!activePathRef.current) return;
            const savedRanges = fileDecorationsRef.current.get(activePathRef.current) || [];
            
            decorationsCollectionRef.current.set(savedRanges.map((range: any) => ({
                range,
                options: {
                    isWholeLine: true,
                    className: 'warden-paste-highlight',
                    description: 'Unchecked paste block',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            })));
        });

        // 2. CORE HEURISTICS: Flag pastes and dispatch to the Rust backend (Sprint 4)
        editor.onDidPaste((e: any) => {
            SystemLogger.log(LogLevel.INFO, 'WardenInterceptor', 'Paste detected. Flagging and dispatching to Engine.');
            
            // Apply visual highlight
            decorationsCollectionRef.current.append([{
                range: e.range,
                options: {
                    isWholeLine: true,
                    className: 'warden-paste-highlight',
                    description: 'Unchecked paste block',
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            }]);

            // Persist the new range to the memory cache
            if (activePathRef.current) {
                fileDecorationsRef.current.set(activePathRef.current, decorationsCollectionRef.current.getRanges());
            }

            // --- SPRINT 4 IPC DISPATCH ---
            try {
                if (activePathRef.current) {
                    const fullFileBuffer = editor.getValue();
                    const targetChunk = editor.getModel().getValueInRange(e.range);
                    
                    // Fire-and-forget asynchronous analysis pipeline
                    WardenIPC.analyzeSelection(
                        activePathRef.current,
                        fullFileBuffer,
                        targetChunk,
                        e.range.startLineNumber
                    );
                }
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'WardenInterceptor', 'Failed to dispatch IPC payload.', err);
            }
        });

        // 3. EVENT LISTENER: Clean up "ghost" highlights if the user deletes the flagged code
        editor.onDidChangeModelContent(() => {
            try {
                const ranges = decorationsCollectionRef.current.getRanges();
                if (!ranges || ranges.length === 0) {
                    if (activePathRef.current) fileDecorationsRef.current.set(activePathRef.current, []);
                    return;
                }

                // Filter out ranges reduced to 0 lines by user backspacing
                const validRanges = ranges.filter((r: any) => !r.isEmpty());

                // Reset Monaco collection if we detected empty ranges
                if (validRanges.length !== ranges.length) {
                    decorationsCollectionRef.current.set(validRanges.map((range: any) => ({
                        range,
                        options: {
                            isWholeLine: true,
                            className: 'warden-paste-highlight',
                            description: 'Unchecked paste block',
                            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                        }
                    })));
                }

                // Sync the cleaned ranges back to the memory cache
                if (activePathRef.current) {
                    fileDecorationsRef.current.set(activePathRef.current, validRanges);
                }
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'WardenInterceptor', 'Failed to clean up paste decorations.', err);
            }
        });

    }, []);

    return { bindWardenHeuristics };
};