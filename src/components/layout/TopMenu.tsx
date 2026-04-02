import React, { useState } from 'react';
import { THEME } from './WorkspaceLayout';
import { useEditorStore } from '@core/state/editorStore';
import { WindowIPC } from '@services/rust-bridge/windowIpc';
import { FileSystemIPC } from '@services/rust-bridge/fileSystemIpc';

/**
 * Implements the primary application toolbar.
 * Strictly adheres to the 'Zero MVP' rule by only providing functional items.
 */
export const TopMenu: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const { 
        activeFilePath, 
        closeFile, 
        isTerminalVisible, 
        isWardenVisible, 
        toggleTerminal, 
        toggleWarden,
        requestSave 
    } = useEditorStore();

    const handleOpenFolder = async () => {
        setActiveMenu(null);
        await FileSystemIPC.promptDirectorySelection();
    };

    const handleSaveFile = () => {
        setActiveMenu(null);
        if (activeFilePath) requestSave();
    };

    const handleCloseFile = () => {
        setActiveMenu(null);
        if (activeFilePath) closeFile(activeFilePath);
    };

    return (
        <div style={styles.titlebar} data-tauri-drag-region>
            <div style={styles.leftSection}>
                <div style={styles.logo} data-tauri-drag-region>W</div>
                
                {/* Menu: File */}
                <div style={styles.menuItemWrapper}>
                    <button 
                        style={activeMenu === 'File' ? styles.menuButtonActive : styles.menuButton} 
                        onClick={() => setActiveMenu(activeMenu === 'File' ? null : 'File')}
                    >
                        File
                    </button>
                    {activeMenu === 'File' && (
                        <div style={styles.dropdown}>
                            <div style={styles.dropdownItem} onClick={handleOpenFolder}>Open Folder</div>
                            <div style={styles.dropdownItem} onClick={handleSaveFile}>Save File</div>
                            <div style={styles.dropdownItem} onClick={handleCloseFile}>Close Tab</div>
                        </div>
                    )}
                </div>

                {/* Menu: View */}
                <div style={styles.menuItemWrapper}>
                    <button 
                        style={activeMenu === 'View' ? styles.menuButtonActive : styles.menuButton} 
                        onClick={() => setActiveMenu(activeMenu === 'View' ? null : 'View')}
                    >
                        View
                    </button>
                    {activeMenu === 'View' && (
                        <div style={styles.dropdown}>
                            <div style={styles.dropdownItem} onClick={() => { toggleTerminal(); setActiveMenu(null); }}>
                                {isTerminalVisible ? 'Hide Terminal' : 'Show Terminal'}
                            </div>
                            <div style={styles.dropdownItem} onClick={() => { toggleWarden(); setActiveMenu(null); }}>
                                {isWardenVisible ? 'Hide Warden Analysis' : 'Show Warden Analysis'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={styles.windowControls}>
                <button style={styles.controlButton} onClick={() => WindowIPC.minimize()}>&#8211;</button>
                <button style={styles.controlButton} onClick={() => WindowIPC.toggleMaximize()}>&#10064;</button>
                <button style={styles.closeButton} onClick={() => WindowIPC.close()}>&#10005;</button>
            </div>

            {activeMenu && <div style={styles.overlay} onClick={() => setActiveMenu(null)} />}
        </div>
    );
};

const styles = {
    titlebar: {
        height: '30px',
        backgroundColor: THEME.deepVoid,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${THEME.synthwaveViolet}`,
        userSelect: 'none' as const,
    },
    leftSection: { display: 'flex', alignItems: 'center', height: '100%' },
    logo: { color: THEME.retroPlasma, fontWeight: 'bold', padding: '0 12px', fontSize: '14px', cursor: 'default' },
    menuItemWrapper: { position: 'relative' as const, height: '100%' },
    menuButton: {
        background: 'none',
        border: 'none',
        color: THEME.textPrimary,
        fontSize: '12px',
        padding: '0 12px',
        cursor: 'pointer',
        height: '100%',
    },
    menuButtonActive: {
        background: THEME.midnightPurple,
        border: 'none',
        color: THEME.textPrimary,
        fontSize: '12px',
        padding: '0 12px',
        cursor: 'pointer',
        height: '100%',
    },
    dropdown: {
        position: 'absolute' as const,
        top: '30px',
        left: 0,
        backgroundColor: THEME.midnightPurple,
        border: `1px solid ${THEME.synthwaveViolet}`,
        minWidth: '160px',
        zIndex: 1000,
        padding: '4px 0',
    },
    dropdownItem: {
        padding: '6px 16px',
        fontSize: '12px',
        color: THEME.textPrimary,
        cursor: 'pointer',
        backgroundColor: 'transparent',
    },
    windowControls: { display: 'flex', height: '100%' },
    controlButton: {
        background: 'none',
        border: 'none',
        width: '45px',
        height: '100%',
        color: THEME.textPrimary,
        cursor: 'pointer',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        width: '45px',
        height: '100%',
        color: THEME.textPrimary,
        cursor: 'pointer',
    },
    overlay: { position: 'fixed' as const, top: '30px', left: 0, right: 0, bottom: 0, zIndex: 999 }
};