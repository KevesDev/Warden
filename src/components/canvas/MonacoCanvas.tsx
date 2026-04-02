import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useEditorStore } from '@core/state/editorStore';
import { FileOpsIPC } from '@services/rust-bridge/fileOpsIpc';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { THEME } from '@components/layout/WorkspaceLayout';

/**
 * Maps file extensions to Monaco's built-in language identifiers.
 */
const determineLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx': return 'typescript';
        case 'js':
        case 'jsx': return 'javascript';
        case 'rs': return 'rust';
        case 'cpp':
        case 'h': return 'cpp';
        case 'cs': return 'csharp';
        case 'json': return 'json';
        case 'py': return 'python';
        case 'html': return 'html';
        case 'css': return 'css';
        default: return 'plaintext';
    }
};

/**
 * The core text editing interface.
 * Handles massive file virtualization, save states, and paste interception.
 */
export const MonacoCanvas: React.FC = () => {
    const { activeFilePath, setUnsavedChanges } = useEditorStore();
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // Maintain a ref to the editor instance to bind commands and decorations
    const editorRef = useRef<any>(null);
    const decorationsCollectionRef = useRef<any>(null);

    // Fetch file content whenever the active tab changes
    useEffect(() => {
        if (!activeFilePath) {
            setFileContent('');
            return;
        }

        let isMounted = true;
        const loadFile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await FileOpsIPC.readFile(activeFilePath);
                if (isMounted) {
                    setFileContent(response.file_content);
                    setUnsavedChanges(false);
                }
            } catch (err: any) {
                SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', `Failed to load ${activeFilePath}`, err);
                if (isMounted) setError(`Failed to read file: ${err}`);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadFile();

        return () => { isMounted = false; };
    }, [activeFilePath, setUnsavedChanges]);

    /**
     * Called when Monaco successfully mounts into the DOM.
     * We bind our native save shortcut and the paste interceptor here.
     */
    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // 1. Bind Ctrl+S / Cmd+S to the Rust Write IPC
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
            if (!activeFilePath) return;
            const currentText = editor.getValue();
            
            try {
                SystemLogger.log(LogLevel.INFO, 'MonacoCanvas', `Saving file: ${activeFilePath}`);
                const response = await FileOpsIPC.writeFile(activeFilePath, currentText);
                
                if (response.success) {
                    setUnsavedChanges(false);
                } else {
                    SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', `Save failed: ${response.error_message}`);
                }
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', 'Critical error during save', err);
            }
        });

        // 2. Intercept Paste Events for the Warden Engine (Sprint 4 Integration)
        editor.onDidPaste((e) => {
            const range = e.range;
            
            // Apply visual cue (Synthwave Violet background)
            if (!decorationsCollectionRef.current) {
                decorationsCollectionRef.current = editor.createDecorationsCollection();
            }
            
            decorationsCollectionRef.current.set([{
                range: range,
                options: {
                    isWholeLine: true,
                    className: 'warden-paste-highlight',
                    description: 'Warden Paste Analysis Highlight'
                }
            }]);

            SystemLogger.log(LogLevel.INFO, 'WardenEngine', 'Code block pasted. Routing to heuristic engine for analysis.', { range });
            
            // NOTE: In Sprint 4, we will pass `editor.getValueInRange(range)` to the Rust Warden Engine here.
        });
    };

    /**
     * Flags the global state when the user types.
     */
    const handleEditorChange = (value: string | undefined) => {
        setUnsavedChanges(true);
    };

    if (!activeFilePath) {
        return (
            <div style={styles.emptyStateContainer}>
                <span style={styles.emptyStateText}>Warden IDE Canvas</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <span style={styles.errorText}>{error}</span>
            </div>
        );
    }

    return (
        <div style={styles.canvasWrapper}>
            {/* Inject our strict Synthwave Violet paste decoration styling directly into the DOM layer */}
            <style>
                {`
                .warden-paste-highlight {
                    background-color: rgba(92, 62, 148, 0.3); /* THEME.synthwaveViolet at 30% opacity */
                }
                `}
            </style>
            
            {isLoading && <div style={styles.loadingOverlay}>Reading file...</div>}
            
            <Editor
                height="100%"
                width="100%"
                theme="vs-dark" // Standard dark theme matching the Deep Void background
                language={determineLanguage(activeFilePath)}
                value={fileContent}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false }, // Minimalist retro feel
                    wordWrap: 'on',
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    fontSize: 14,
                    padding: { top: 16 }
                }}
            />
        </div>
    );
};

const styles = {
    canvasWrapper: {
        flex: 1,
        position: 'relative' as const,
        backgroundColor: THEME.deepVoid,
    },
    emptyStateContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.deepVoid,
    },
    emptyStateText: {
        color: THEME.textSecondary,
        fontSize: '24px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        opacity: 0.2,
    },
    errorContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.deepVoid,
    },
    errorText: {
        color: THEME.retroPlasma,
        fontSize: '14px',
        backgroundColor: 'rgba(242, 89, 18, 0.1)',
        padding: '8px 16px',
        borderRadius: '4px',
    },
    loadingOverlay: {
        position: 'absolute' as const,
        top: 0,
        right: 0,
        padding: '4px 12px',
        backgroundColor: THEME.midnightPurple,
        color: THEME.textSecondary,
        fontSize: '12px',
        zIndex: 10,
        borderBottomLeftRadius: '4px',
        borderLeft: `1px solid ${THEME.synthwaveViolet}`,
        borderBottom: `1px solid ${THEME.synthwaveViolet}`,
    }
};