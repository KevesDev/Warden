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
        case 'html': return 'html';
        case 'css': return 'css';
        default: return 'plaintext';
    }
};

export const MonacoCanvas: React.FC = () => {
    const { activeFilePath, setUnsavedChanges, saveRequestedAt } = useEditorStore();
    const [fileContent, setFileContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    
    const editorRef = useRef<any>(null);

    // Save Logic triggered by System Menu or Hotkey
    const handleSave = async () => {
        if (!activeFilePath || !editorRef.current) return;
        const currentText = editorRef.current.getValue();
        
        try {
            const response = await FileOpsIPC.writeFile(activeFilePath, currentText);
            if (response.success) {
                setUnsavedChanges(false);
                SystemLogger.log(LogLevel.INFO, 'MonacoCanvas', `File saved successfully: ${activeFilePath}`);
            }
        } catch (err) {
            SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', 'Critical save failure', err);
        }
    };

    // Listen for the save trigger from the Top Menu
    useEffect(() => {
        if (saveRequestedAt) {
            handleSave();
        }
    }, [saveRequestedAt]);

    useEffect(() => {
        if (!activeFilePath) {
            setFileContent('');
            return;
        }

        const loadFile = async () => {
            setIsLoading(true);
            try {
                const response = await FileOpsIPC.readFile(activeFilePath);
                setFileContent(response.file_content);
                setUnsavedChanges(false);
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'MonacoCanvas', `Failed to load ${activeFilePath}`, err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFile();
    }, [activeFilePath, setUnsavedChanges]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
    };

    if (!activeFilePath) {
        return (
            <div style={styles.emptyStateContainer}>
                <span style={styles.emptyStateText}>Warden IDE Canvas</span>
            </div>
        );
    }

    return (
        <div style={styles.canvasWrapper}>
            {isLoading && <div style={styles.loadingOverlay}>Reading file...</div>}
            <Editor
                height="100%"
                width="100%"
                theme="vs-dark"
                language={determineLanguage(activeFilePath)}
                value={fileContent}
                onChange={() => setUnsavedChanges(true)}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 14,
                }}
            />
        </div>
    );
};

const styles = {
    canvasWrapper: { flex: 1, position: 'relative' as const, backgroundColor: THEME.deepVoid },
    emptyStateContainer: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.deepVoid,
    },
    emptyStateText: { color: THEME.textSecondary, fontSize: '24px', fontWeight: 'bold', opacity: 0.2 },
    loadingOverlay: {
        position: 'absolute' as const,
        top: 0,
        right: 0,
        padding: '4px 12px',
        backgroundColor: THEME.midnightPurple,
        color: THEME.textSecondary,
        zIndex: 10,
    }
};