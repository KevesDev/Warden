import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useEditorStore } from '@core/state/editorStore';
import { FileOpsIPC } from '@services/rust-bridge/fileOpsIpc';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { THEME } from '@core/constants/theme';

const determineLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx': return 'typescript';
        case 'js':
        case 'jsx': return 'javascript';
        case 'rs': return 'rust';
        case 'json': return 'json';
        default: return 'plaintext';
    }
};

/**
 * Main code editor instance.
 * Implements lazy-loading from disk and Warden paste analysis highlights.
 */
export const MonacoCanvas: React.FC = () => {
    const { activeFilePath, fileBuffers, hydrateBuffer, updateBuffer, saveActiveFile } = useEditorStore();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<any>(null);

    // Effect: Detect file switch and lazy-load content from disk if buffer is missing
    useEffect(() => {
        if (!activeFilePath) return;
        
        // If the buffer is already in memory, do not re-read from disk.
        if (fileBuffers.has(activeFilePath)) return;

        const loadContentFromDisk = async () => {
            setIsLoading(true);
            try {
                SystemLogger.log(LogLevel.INFO, 'MonacoCanvas', `Lazy-loading content: ${activeFilePath}`);
                const res = await FileOpsIPC.readFile(activeFilePath);
                hydrateBuffer(activeFilePath, res.file_content);
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', `Disk read failed: ${activeFilePath}`, err);
            } finally {
                setIsLoading(false);
            }
        };

        loadContentFromDisk();
    }, [activeFilePath, fileBuffers, hydrateBuffer]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        decorationsRef.current = editor.createDecorationsCollection();

        // 1. Warden Core Feature: Flag pasted code blocks for analysis
        editor.onDidPaste((e) => {
            SystemLogger.log(LogLevel.INFO, 'WardenEngine', 'Paste event detected. Applying highlight.');
            decorationsRef.current.append([{
                range: e.range,
                options: {
                    isWholeLine: true,
                    className: 'warden-paste-highlight',
                    description: 'Unchecked paste block',
                    // Prevent the highlight from spreading when the user types at the edges or presses enter
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
            }]);
        });

        // 2. Event Listener: Clean up "ghost" highlights when text is deleted
        editor.onDidChangeModelContent(() => {
            try {
                const ranges = decorationsRef.current.getRanges();
                if (!ranges || ranges.length === 0) return;

                // Filter out ranges that have been reduced to nothing (user deleted the text)
                const validRanges = ranges.filter((r: any) => !r.isEmpty());

                // If a deletion caused an empty range, reset the collection with only the valid ones
                if (validRanges.length !== ranges.length) {
                    decorationsRef.current.set(validRanges.map((range: any) => ({
                        range,
                        options: {
                            isWholeLine: true,
                            className: 'warden-paste-highlight',
                            description: 'Unchecked paste block',
                            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                        }
                    })));
                }
            } catch (err) {
                // Failsafe: Ignore transient errors during rapid typing/deletion to prevent editor crash
                SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', 'Failed to clean up paste decorations', err);
            }
        });

        // 3. Key Command: Map Ctrl+S to the store's saveActiveFile action
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            saveActiveFile();
        });
    };

    if (!activeFilePath) {
        return (
            <div style={styles.emptyContainer}>
                <span style={styles.emptyTitle}>WARDEN_IDE</span>
            </div>
        );
    }

    return (
        <div style={styles.canvasContainer}>
            <style>
                {`.warden-paste-highlight { background-color: rgba(92, 62, 148, 0.25); border-left: 2px solid ${THEME.retroPlasma}; }`}
            </style>
            
            {isLoading && <div style={styles.loadingIndicator}>Reading native file...</div>}
            
            <Editor
                height="100%"
                theme="vs-dark"
                path={activeFilePath} // Using path allows Monaco to handle model switching internally
                language={determineLanguage(activeFilePath)}
                value={fileBuffers.get(activeFilePath) || ''}
                onMount={handleEditorDidMount}
                onChange={(val) => updateBuffer(activeFilePath, val || '')}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', monospace",
                    padding: { top: 12 },
                    cursorBlinking: 'smooth'
                }}
            />
        </div>
    );
};

const styles = {
    canvasContainer: { flex: 1, position: 'relative' as const, backgroundColor: THEME.deepVoid },
    emptyContainer: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.deepVoid },
    emptyTitle: { color: THEME.textSecondary, fontSize: '32px', fontWeight: 'bold', opacity: 0.1, letterSpacing: '4px' },
    loadingIndicator: { position: 'absolute' as const, top: 0, right: 0, padding: '4px 12px', backgroundColor: THEME.midnightPurple, zIndex: 10, color: THEME.textSecondary, fontSize: '11px', borderBottomLeftRadius: '4px' }
};