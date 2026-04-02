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

export const MonacoCanvas: React.FC = () => {
    const { activeFilePath, fileBuffers, updateBuffer, openFile } = useEditorStore();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<any>(null);

    // Sync buffer when active tab changes
    useEffect(() => {
        if (!activeFilePath) return;
        
        // If buffer already exists, we don't reload from disk
        if (fileBuffers.has(activeFilePath)) return;

        const load = async () => {
            setIsLoading(true);
            try {
                const res = await FileOpsIPC.readFile(activeFilePath);
                openFile(activeFilePath, res.file_content);
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', `Read error: ${activeFilePath}`, err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [activeFilePath]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        decorationsRef.current = editor.createDecorationsCollection();

        // 1. Restore Paste Highlighting (Warden Core Feature)
        editor.onDidPaste((e) => {
            SystemLogger.log(LogLevel.INFO, 'WardenEngine', 'Paste detected. Flagging block.');
            decorationsRef.current.append([{
                range: e.range,
                options: {
                    isWholeLine: true,
                    className: 'warden-paste-highlight',
                    description: 'Pasted block for analysis'
                }
            }]);
        });

        // 2. Bind Save Command
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
            if (!activeFilePath) return;
            const content = editor.getValue();
            const res = await FileOpsIPC.writeFile(activeFilePath, content);
            if (res.success) {
                // Clear dirty flag manually via store update if needed
                useEditorStore.getState().setStatus('Saved.');
            }
        });
    };

    if (!activeFilePath) {
        return <div style={styles.empty}>Select a file to edit.</div>;
    }

    return (
        <div style={styles.container}>
            <style>
                {`.warden-paste-highlight { background-color: rgba(146, 108, 224, 0.25); border-left: 2px solid ${THEME.retroPlasma}; }`}
            </style>
            {isLoading && <div style={styles.loading}>Loading...</div>}
            <Editor
                height="100%"
                theme="vs-dark"
                language={determineLanguage(activeFilePath)}
                value={fileBuffers.get(activeFilePath) || ''}
                onMount={handleEditorDidMount}
                onChange={(val) => updateBuffer(activeFilePath, val || '')}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 10 }
                }}
            />
        </div>
    );
};

const styles = {
    container: { flex: 1, position: 'relative' as const, backgroundColor: THEME.deepVoid },
    empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.textSecondary, backgroundColor: THEME.deepVoid },
    loading: { position: 'absolute' as const, top: 0, right: 0, padding: '5px 10px', backgroundColor: THEME.midnightPurple, zIndex: 10, color: THEME.textSecondary, fontSize: '12px' }
};