import React from 'react';
import { FileSystemIPC } from '@services/rust-bridge/fileSystemIpc';
import { useEditorStore } from '@core/state/editorStore';
import { FileNodeItem } from './FileNodeItem';
import { THEME } from '@core/constants/theme';

/**
 * Tree-view navigator for the local workspace.
 */
export const FileExplorer: React.FC = () => {
    const { rootNode } = useEditorStore();

    // Uses the shared Workspace initialization logic from the centralized service
    const handleOpenFolder = () => FileSystemIPC.openWorkspace();

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>EXPLORER</span>
                <button style={styles.actionButton} onClick={handleOpenFolder}>
                    Open Folder
                </button>
            </div>
            
            <div style={styles.treeContainer}>
                {!rootNode ? (
                    <div style={styles.emptyMessage}>No workspace selected.</div>
                ) : (
                    /* *
                     * Applying the path as the 'key' forces React to completely unmount 
                     * and remount this component when the workspace changes. 
                     * This prevents the useFileNode hook from holding onto stale children state.
                     */
                    <FileNodeItem key={rootNode.path} node={rootNode} depth={0} />
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', flexDirection: 'column' as const, height: '100%', backgroundColor: THEME.midnightPurple },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${THEME.synthwaveViolet}` },
    title: { fontSize: '11px', fontWeight: 'bold', color: THEME.textSecondary, letterSpacing: '1px' },
    actionButton: { backgroundColor: THEME.retroPlasma, color: '#FFFFFF', border: 'none', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px', fontWeight: 'bold' },
    treeContainer: { flex: 1, overflow: 'auto' as const, paddingTop: '6px' },
    emptyMessage: { padding: '12px', color: THEME.textSecondary, fontSize: '13px', textAlign: 'center' as const }
};