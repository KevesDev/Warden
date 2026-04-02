import React from 'react';
import { TopMenu } from './TopMenu';
import { StatusBar } from './StatusBar';
import { THEME } from '@core/constants/theme';
import { useEditorStore } from '@core/state/editorStore';

interface WorkspaceLayoutProps {
    leftSidebar: React.ReactNode;
    centerCanvas: React.ReactNode;
    bottomTerminal: React.ReactNode;
    rightSidebar: React.ReactNode;
}

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
                <aside style={styles.leftSidebar}>{leftSidebar}</aside>

                <main style={styles.centerColumn}>
                    <div style={styles.canvasArea}>{centerCanvas}</div>
                    {isTerminalVisible && (
                        <div style={styles.terminalArea}>{bottomTerminal}</div>
                    )}
                </main>

                {isWardenVisible && (
                    <aside style={styles.rightSidebar}>{rightSidebar}</aside>
                )}
            </div>

            <StatusBar />
        </div>
    );
};

const styles = {
    appWrapper: { display: 'flex', flexDirection: 'column' as const, height: '100vh', width: '100vw', backgroundColor: THEME.deepVoid, overflow: 'hidden' },
    mainContent: { display: 'flex', flex: 1, overflow: 'hidden' },
    leftSidebar: { width: '260px', backgroundColor: THEME.midnightPurple, borderRight: `1px solid ${THEME.synthwaveViolet}`, display: 'flex', flexDirection: 'column' as const },
    centerColumn: { flex: 1, display: 'flex', flexDirection: 'column' as const },
    canvasArea: { flex: 1, backgroundColor: THEME.deepVoid, position: 'relative' as const },
    terminalArea: { height: '280px', backgroundColor: THEME.midnightPurple, borderTop: `1px solid ${THEME.synthwaveViolet}` },
    rightSidebar: { width: '320px', backgroundColor: THEME.midnightPurple, borderLeft: `1px solid ${THEME.synthwaveViolet}`, display: 'flex', flexDirection: 'column' as const }
};