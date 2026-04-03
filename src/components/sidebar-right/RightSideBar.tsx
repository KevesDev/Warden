import React from 'react';
import { ChatInterface } from './ChatInterface';
import { LinterBoard } from './LinterBoard';
import { THEME } from '@core/constants/theme';

/**
 * Main container for the right sidebar.
 * Implements a flex-based vertical split-view: AI Chat on top, Heuristic Analysis on the bottom.
 * Decoupled presentation component with independent overflow scrolling contexts.
 */
export const RightSidebar: React.FC = () => {
    return (
        <div style={styles.container}>
            {/* Top Half: AI Chat Interface */}
            <div style={styles.chatSection}>
                <ChatInterface />
            </div>

            {/* Bottom Half: Linter Board */}
            <div style={styles.linterSection}>
                <LinterBoard />
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        width: '100%',
    },
    chatSection: {
        flex: 1, 
        display: 'flex',
        flexDirection: 'column' as const,
        borderBottom: `2px solid ${THEME.deepVoid}`, // Strict visual separator
        overflow: 'hidden', // Prevents chat from pushing the linter board off-screen
    },
    linterSection: {
        flex: 1, 
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: THEME.deepVoid,
        overflow: 'hidden',
    }
};