import React from 'react';
import { useWardenStore } from '@core/state/wardenStore';
import { THEME } from '@core/constants/theme';
import { LinterCardItem } from './LinterCardItem';

/**
 * Main container for the Heuristic Analysis UI.
 * Subscribes to the global warden store and dynamically renders
 * technical debt flags caught by the Rust backend.
 */
export const LinterBoard: React.FC = () => {
    const { activeAnalysis, isAnalyzing } = useWardenStore();

    if (isAnalyzing) {
        return (
            <div style={styles.centerContainer}>
                <span style={styles.statusText}>Running Heuristics...</span>
            </div>
        );
    }

    if (!activeAnalysis) {
        return (
            <div style={styles.centerContainer}>
                <span style={styles.statusText}>No active analysis.</span>
            </div>
        );
    }

    if (activeAnalysis.is_clean || activeAnalysis.cards.length === 0) {
        return (
            <div style={styles.centerContainer}>
                <span style={{ ...styles.statusText, color: THEME.matrixGreen, opacity: 1 }}>
                    CODE STRUCTURALLY SOUND
                </span>
                <span style={styles.timeText}>
                    Analyzed in {activeAnalysis.execution_time_ms}ms
                </span>
            </div>
        );
    }

    return (
        <div style={styles.boardContainer}>
            <div style={styles.statsHeader}>
                <span>{activeAnalysis.cards.length} Issues Found</span>
                <span>{activeAnalysis.execution_time_ms}ms</span>
            </div>
            
            <div style={styles.cardList}>
                {activeAnalysis.cards.map(card => (
                    <LinterCardItem key={card.id} card={card} />
                ))}
            </div>
        </div>
    );
};

const styles = {
    centerContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: THEME.deepVoid,
    },
    statusText: {
        color: THEME.textSecondary,
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        opacity: 0.5,
    },
    timeText: {
        color: THEME.textSecondary,
        fontSize: '10px',
        marginTop: '8px',
        opacity: 0.3,
        fontFamily: "'Fira Code', monospace",
    },
    boardContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        backgroundColor: THEME.deepVoid,
        overflow: 'hidden',
    },
    statsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: THEME.panelHeader,
        borderBottom: `1px solid ${THEME.midnightPurple}`,
        fontSize: '11px',
        color: THEME.textSecondary,
        fontFamily: "'Fira Code', monospace",
    },
    cardList: {
        flex: 1,
        padding: '16px',
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
    }
};