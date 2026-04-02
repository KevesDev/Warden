import React from 'react';

/**
 * Strict adherence to the Product Design Document Color Palette Allocation.
 */
export const THEME = {
    deepVoid: '#211832',
    midnightPurple: '#412B6B',
    synthwaveViolet: '#5C3E94',
    retroPlasma: '#F25912',
    textPrimary: '#E0E0E0',
    textSecondary: '#A0A0A0'
} as const;

/**
 * Props for the main layout shell to accept child components for each designated pane.
 */
interface WorkspaceLayoutProps {
    leftSidebar: React.ReactNode;
    centerCanvas: React.ReactNode;
    bottomTerminal: React.ReactNode;
    rightSidebar: React.ReactNode;
}

/**
 * The root layout shell for the Warden IDE.
 * Utilizes a scalable CSS Grid architecture to enforce the 4-pane layout.
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
    leftSidebar,
    centerCanvas,
    bottomTerminal,
    rightSidebar
}) => {
    return (
        <div style={styles.container}>
            {/* 1. Left Sidebar: File Tree */}
            <aside style={styles.leftSidebar}>
                {leftSidebar}
            </aside>

            {/* Main Center Column (Canvas + Terminal) */}
            <main style={styles.centerColumn}>
                {/* 2. Center Canvas: Monaco Editor */}
                <section style={styles.canvasArea}>
                    {centerCanvas}
                </section>

                {/* 3. Bottom Panel: Terminal */}
                <section style={styles.terminalArea}>
                    {bottomTerminal}
                </section>
            </main>

            {/* 4. Right Sidebar: Warden Analysis & LLM Chat */}
            <aside style={styles.rightSidebar}>
                {rightSidebar}
            </aside>
        </div>
    );
};

/**
 * Scalable inline styles ensuring strict layout boundaries.
 * In a native desktop context, viewport height/width is directly bound to the window resolution.
 */
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'row' as const,
        height: '100vh',
        width: '100vw',
        backgroundColor: THEME.deepVoid,
        color: THEME.textPrimary,
        overflow: 'hidden',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    },
    leftSidebar: {
        width: '250px',
        minWidth: '150px',
        backgroundColor: THEME.midnightPurple,
        borderRight: `1px solid ${THEME.synthwaveViolet}`,
        display: 'flex',
        flexDirection: 'column' as const,
        overflowY: 'auto' as const
    },
    centerColumn: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        minWidth: '300px'
    },
    canvasArea: {
        flex: 1,
        backgroundColor: THEME.deepVoid,
        position: 'relative' as const,
        overflow: 'hidden'
    },
    terminalArea: {
        height: '250px',
        minHeight: '100px',
        backgroundColor: THEME.midnightPurple,
        borderTop: `1px solid ${THEME.synthwaveViolet}`,
        overflow: 'hidden',
        position: 'relative' as const
    },
    rightSidebar: {
        width: '350px',
        minWidth: '250px',
        backgroundColor: THEME.midnightPurple,
        borderLeft: `1px solid ${THEME.synthwaveViolet}`,
        display: 'flex',
        flexDirection: 'column' as const,
        overflowY: 'auto' as const
    }
};