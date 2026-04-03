import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useEditorStore } from '@core/state/editorStore';
import { THEME } from '@core/constants/theme';

// Decoupled Logic Hooks
import { useFileLoader } from './hooks/useFileLoader';
import { useWardenInterceptor } from './hooks/useWardenInterceptor';

/**
 * Maps file extensions to Monaco-supported language IDs.
 * Ensures proper syntax highlighting and prevents false-positive syntax errors.
 */
const getLanguageByExtension = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx': return 'typescript';
        case 'js':
        case 'jsx': return 'javascript';
        case 'rs':   return 'rust';
        case 'json': return 'json';
        case 'md':   return 'markdown';
        case 'css':  return 'css';
        case 'html': return 'html';
        default:     return 'plaintext';
    }
};

/**
 * Decoupled Presentation Component for the Warden IDE editor.
 * Corrects language detection regressions and fixes scrollbar overlap
 * through dedicated layout tracks and viewport clipping.
 */
export const MonacoCanvas: React.FC = () => {
    const { activeFilePath, fileBuffers, updateBuffer, saveActiveFile } = useEditorStore();
    
    // Abstracted Lifecycle Hooks
    const { isLoading } = useFileLoader();
    const { bindWardenHeuristics } = useWardenInterceptor();
    
    const editorRef = useRef<any>(null);

    // Forces editor to re-calculate container dimensions on mount/tab switch
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.layout();
        }
    }, [activeFilePath]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Bind Heuristic Engine and provide the monaco namespace
        bindWardenHeuristics(editor, monaco);

        // Native Save Shortcut (Ctrl+S)
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
                {`
                    /* TECHNICAL FIX: Scrollbar Overlap.
                       Using a linear-gradient ensures the 'isWholeLine' highlight 
                       respects the scrollbar track without needing new UI elements.
                    */
                    .warden-paste-highlight { 
                        background: linear-gradient(
                            to right, 
                            rgba(92, 62, 148, 0.15) calc(100% - 12px), 
                            transparent calc(100% - 12px)
                        ) !important;
                    }

                    /* Ensures the vertical scrollbar track matches the editor theme */
                    .monaco-editor .monaco-scrollable-element .scrollbar.vertical {
                        background: ${THEME.deepVoid};
                    }
                `}
            </style>
            
            {isLoading && <div style={styles.loadingIndicator}>Reading native file...</div>}
            
            <Editor
                height="100%"
                theme="vs-dark"
                path={activeFilePath} 
                language={getLanguageByExtension(activeFilePath)}
                value={fileBuffers.get(activeFilePath) || ''}
                onMount={handleEditorDidMount}
                onChange={(val) => updateBuffer(activeFilePath, val || '')}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', monospace",
                    padding: { top: 12, bottom: 12 },
                    cursorBlinking: 'smooth',
                    automaticLayout: true,
                    
                    // Restore horizontal scrolling as per Developer Muscle Memory
                    wordWrap: 'off',
                    
                    // Ensures text viewport does not bleed into scrollbar space
                    scrollBeyondLastColumn: 5,

                    // Forces scrollbars into a dedicated, non-overlay track
                    scrollbar: {
                        vertical: 'visible',
                        horizontal: 'visible',
                        useShadows: false,
                        verticalScrollbarSize: 12,
                        horizontalScrollbarSize: 12,
                    },
                    
                    // Production-level UI configuration
                    fixedOverflowWidgets: true,
                    renderLineHighlight: 'all',
                    lineNumbersMinChars: 3
                }}
            />
        </div>
    );
};

const styles = {
    canvasContainer: { flex: 1, position: 'relative' as const, backgroundColor: THEME.deepVoid, overflow: 'hidden' },
    emptyContainer: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.deepVoid },
    emptyTitle: { color: THEME.textSecondary, fontSize: '32px', fontWeight: 'bold', opacity: 0.1, letterSpacing: '4px' },
    loadingIndicator: { position: 'absolute' as const, top: 0, right: 0, padding: '4px 12px', backgroundColor: THEME.midnightPurple, zIndex: 10, color: THEME.textSecondary, fontSize: '11px', borderBottomLeftRadius: '4px' }
};