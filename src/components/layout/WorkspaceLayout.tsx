import React from 'react';
import { TopMenu } from './TopMenu';
import { StatusBar } from './StatusBar';
import { THEME } from '@core/constants/theme';

interface WorkspaceLayoutProps {
    leftSidebar: React.ReactNode;
    centerCanvas: React.ReactNode;
    rightSidebar: React.ReactNode;
    bottomTerminal: React.ReactNode;
}

/**
 * Core structural layout for the Warden IDE.
 * Implements a strict Grid/Flex hybrid to ensure panels do not bleed or overlap.
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
    leftSidebar,
    centerCanvas,
    rightSidebar,
    bottomTerminal
}) => {
    return (
        <div style={styles.viewport}>
            <TopMenu />
            
            <main style={styles.mainContent}>
                <aside style={styles.leftPanel}>
                    {leftSidebar}
                </aside>
                
                <section style={styles.centerStack}>
                    <div style={styles.editorArea}>
                        {centerCanvas}
                    </div>
                    <footer style={styles.terminalArea}>
                        {bottomTerminal}
                    </footer>
                </section>
                
                <aside style={styles.rightPanel}>
                    {rightSidebar}
                </aside>
            </main>

            <StatusBar />
        </div>
    );
};

const styles = {
    viewport: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100vh',
        width: '100vw',
        backgroundColor: THEME.deepVoid,
        overflow: 'hidden', // ARCHITECTURAL GUARD: Prevents entire app from scrolling
    },
    mainContent: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
    },
    leftPanel: {
        width: '260px',
        borderRight: `1px solid ${THEME.midnightPurple}`,
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: THEME.deepVoid,
    },
    centerStack: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
    },
    editorArea: {
        flex: 2, // Editor takes twice the space of the terminal
        display: 'flex',
        overflow: 'hidden',
        borderBottom: `1px solid ${THEME.midnightPurple}`,
    },
    terminalArea: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: THEME.deepVoid,
    },
    rightPanel: {
        width: '350px',
        borderLeft: `1px solid ${THEME.midnightPurple}`,
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: THEME.deepVoid,
    }
};