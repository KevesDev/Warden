import React from 'react';
import { TopMenu } from './TopMenu';
import { useEditorStore } from '@core/state/editorStore';

/**
 * Strict color palette definitions for the Warden retro aesthetic.
 */
export const THEME = {
    deepVoid: '#211832',
    midnightPurple: '#412B6B',
    synthwaveViolet: '#5C3E94',
    retroPlasma: '#F25912',
    textPrimary: '#E0E0E0',
    textSecondary: '#A0A0A0'
} as const;

interface WorkspaceLayoutProps {
    leftSidebar: React.ReactNode;
    centerCanvas: React.ReactNode;
    bottomTerminal: React.ReactNode;
    rightSidebar: React.ReactNode;
}

/**
 * Root UI shell for the Warden IDE.
 * Manages the high-level arrangement of core panes and the custom titlebar.
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
    leftSidebar,
    centerCanvas,
    bottomTerminal,
    rightSidebar
}) => {
    const { isTerminalVisible, isWardenVisible } = useEditorStore();

    return (
        <div style={styles.appWrapper}>
            <TopMenu />
            
            <div style={styles.mainContent}>
                <aside style={styles.leftSidebar}>
                    {leftSidebar}
                </aside>

                <main style={styles.centerColumn}>
                    <div style={styles.canvasArea}>
                        {centerCanvas}
                    </div>

                    {isTerminalVisible && (
                        <div style={styles.terminalArea}>
                            {bottomTerminal}
                        </div>
                    )}
                </main>

                {isWardenVisible && (
                    <aside style={styles.rightSidebar}>
                        {rightSidebar}
                    </aside>
                )}
            </div>
        </div>
    );
};

const styles = {
    appWrapper: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100vh',
        width: '100vw',
        backgroundColor: THEME.deepVoid,
        overflow: 'hidden',
    },
    mainContent: {
        display: 'flex',
        flexDirection: 'row' as const,
        flex: 1,
        overflow: 'hidden'
    },
    leftSidebar: {
        width: '260px',
        minWidth: '150px',
        backgroundColor: THEME.midnightPurple,
        borderRight: `1px solid ${THEME.synthwaveViolet}`,
        display: 'flex',
        flexDirection: 'column' as const,
    },
    centerColumn: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
    },
    canvasArea: {
        flex: 1,
        backgroundColor: THEME.deepVoid,
        position: 'relative' as const,
    },
    terminalArea: {
        height: '280px',
        minHeight: '100px',
        backgroundColor: THEME.midnightPurple,
        borderTop: `1px solid ${THEME.synthwaveViolet}`,
    },
    rightSidebar: {
        width: '320px',
        minWidth: '200px',
        backgroundColor: THEME.midnightPurple,
        borderLeft: `1px solid ${THEME.synthwaveViolet}`,
        display: 'flex',
        flexDirection: 'column' as const,
    }
};