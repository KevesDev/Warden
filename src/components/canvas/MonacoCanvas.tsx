import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useEditorStore } from '@core/state/editorStore';
import { THEME } from '@core/constants/theme';

// Modular logic hooks
import { useFileLoader } from './hooks/useFileLoader';
import { useWardenInterceptor } from './hooks/useWardenInterceptor';

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
 * Decoupled Presentation Component for the core code editor.
 * Delegates native I/O and heuristic event interception to dedicated custom hooks.
 */
export const MonacoCanvas: React.FC = () => {
    const { activeFilePath, fileBuffers, updateBuffer, saveActiveFile } = useEditorStore();
    
    // Feature Hooks
    const { isLoading } = useFileLoader();
    const { bindWardenHeuristics } = useWardenInterceptor();
    
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Inject the proprietary Warden background logic
        bindWardenHeuristics(editor, monaco);

        // Map native Save command to the global Zustand store action
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
                path={activeFilePath} // Natively commands Monaco to swap the ITextModel
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