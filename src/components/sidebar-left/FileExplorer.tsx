import React, { useState } from 'react';
import { FileNode } from '@core/contracts/FileTree';
import { FileSystemIPC } from '@services/rust-bridge/fileSystemIpc';
import { FileNodeItem } from './FileNodeItem';
import { THEME } from '@components/layout/WorkspaceLayout';

export const FileExplorer: React.FC = () => {
    const [rootNode, setRootNode] = useState<FileNode | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);

    const handleOpenFolder = async () => {
        try {
            const selectedPath = await FileSystemIPC.promptDirectorySelection();
            if (selectedPath) {
                setIsInitializing(true);
                const response = await FileSystemIPC.readDirectory(selectedPath);
                setRootNode(response.root_node);
            }
        } catch (error) {
            console.error("Error opening folder:", error);
        } finally {
            setIsInitializing(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>EXPLORER</span>
                <button style={styles.actionButton} onClick={handleOpenFolder}>
                    Open Folder
                </button>
            </div>
            
            <div style={styles.treeContainer}>
                {isInitializing && <div style={styles.message}>Scanning directory...</div>}
                
                {!rootNode && !isInitializing && (
                    <div style={styles.message}>No folder opened.</div>
                )}

                {rootNode && !isInitializing && (
                    <FileNodeItem node={rootNode} depth={0} />
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        backgroundColor: THEME.midnightPurple,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        borderBottom: `1px solid ${THEME.synthwaveViolet}`,
    },
    title: {
        fontSize: '11px',
        fontWeight: 'bold',
        color: THEME.textSecondary,
        letterSpacing: '1px'
    },
    actionButton: {
        backgroundColor: THEME.retroPlasma,
        color: '#FFFFFF',
        border: 'none',
        padding: '4px 8px',
        fontSize: '11px',
        cursor: 'pointer',
        borderRadius: '3px',
        fontWeight: 'bold'
    },
    treeContainer: {
        flex: 1,
        overflowY: 'auto' as const,
        overflowX: 'auto' as const,
        paddingTop: '6px'
    },
    message: {
        padding: '12px',
        color: THEME.textSecondary,
        fontSize: '13px',
        textAlign: 'center' as const
    }
};