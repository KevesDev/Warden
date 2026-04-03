import React, { useState } from 'react';
import { THEME } from '@core/constants/theme';
import { useEditorStore } from '@core/state/editorStore';
import { WindowIPC } from '@services/rust-bridge/WindowIpc';
import { FileSystemIPC } from '@services/rust-bridge/fileSystemIpc';
import { DiagnosticLogger } from '@core/utils/diagnosticLogger';

/**
 * Custom Titlebar implementing industry-standard IDE navigation.
 */
export const TopMenu: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const { 
        activeFilePath, 
        activeWorkspacePath, // Injected for diagnostic export
        setStatus,           // Injected for diagnostic feedback
        closeTab, 
        saveActiveFile,
        saveAll,
        isTerminalVisible, 
        isWardenVisible, 
        toggleTerminal, 
        toggleWarden 
    } = useEditorStore();

    // Helper to close dropdowns after selection
    const run = (action: () => void) => {
        action();
        setActiveMenu(null);
    };

    // Diagnostic Export Handler
    const handleExportDiagnostics = async () => {
        setActiveMenu(null);
        await DiagnosticLogger.exportLog(activeWorkspacePath);
        setStatus('Diagnostic log exported.');
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
                            <div style={styles.dropdownItem} onClick={() => run(FileSystemIPC.openWorkspace)}>Open Folder...</div>
                            <div style={styles.divider} />
                            <div style={styles.dropdownItem} onClick={() => run(saveActiveFile)}>Save</div>
                            <div style={styles.dropdownItem} onClick={() => run(saveAll)}>Save All</div>
                            <div style={styles.divider} />
                            <div style={styles.dropdownItem} onClick={() => run(() => { if (activeFilePath) closeTab(activeFilePath); })}>Close Tab</div>
                        </div>
                    )}
                </div>

                {/* Menu: Edit */}
                <div style={styles.menuItemWrapper}>
                    <button 
                        style={activeMenu === 'Edit' ? styles.menuButtonActive : styles.menuButton} 
                        onClick={() => setActiveMenu(activeMenu === 'Edit' ? null : 'Edit')}
                    >
                        Edit
                    </button>
                    {activeMenu === 'Edit' && (
                        <div style={styles.dropdown}>
                            <div style={styles.dropdownSectionLabel}>Development</div>
                            <div style={styles.dropdownItem} onClick={handleExportDiagnostics}>Export Mock Diagnostics</div>
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
                            <div style={styles.dropdownItem} onClick={() => run(toggleTerminal)}>
                                {isTerminalVisible ? 'Hide Terminal' : 'Show Terminal'}
                            </div>
                            <div style={styles.dropdownItem} onClick={() => run(toggleWarden)}>
                                {isWardenVisible ? 'Hide Warden Sidebar' : 'Show Warden Sidebar'}
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
    titlebar: { height: '30px', backgroundColor: THEME.deepVoid, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${THEME.synthwaveViolet}`, userSelect: 'none' as const },
    leftSection: { display: 'flex', alignItems: 'center', height: '100%' },
    logo: { color: THEME.retroPlasma, fontWeight: 'bold', padding: '0 12px', fontSize: '14px', cursor: 'default' },
    menuItemWrapper: { position: 'relative' as const, height: '100%' },
    menuButton: { background: 'none', border: 'none', color: THEME.textPrimary, fontSize: '12px', padding: '0 12px', cursor: 'pointer', height: '100%' },
    menuButtonActive: { background: THEME.midnightPurple, border: 'none', color: THEME.textPrimary, fontSize: '12px', padding: '0 12px', cursor: 'pointer', height: '100%' },
    dropdown: { position: 'absolute' as const, top: '30px', left: 0, backgroundColor: THEME.midnightPurple, border: `1px solid ${THEME.synthwaveViolet}`, minWidth: '180px', zIndex: 1000, padding: '4px 0', boxShadow: '0px 4px 6px rgba(0,0,0,0.5)' },
    dropdownItem: { padding: '6px 16px', fontSize: '12px', color: THEME.textPrimary, cursor: 'pointer' },
    dropdownSectionLabel: { padding: '4px 16px', fontSize: '10px', color: THEME.textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.5px', cursor: 'default' },
    divider: { height: '1px', backgroundColor: THEME.synthwaveViolet, margin: '4px 0' },
    windowControls: { display: 'flex', height: '100%' },
    controlButton: { background: 'none', border: 'none', width: '45px', height: '100%', color: THEME.textPrimary, cursor: 'pointer' },
    closeButton: { background: 'none', border: 'none', width: '45px', height: '100%', color: THEME.textPrimary, cursor: 'pointer' },
    overlay: { position: 'fixed' as const, top: '30px', left: 0, right: 0, bottom: 0, zIndex: 999 }
};