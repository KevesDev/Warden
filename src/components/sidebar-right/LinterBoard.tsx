import React from 'react';
import { useWardenStore } from '@core/state/wardenStore';
import { THEME } from '@core/constants/theme';
import { LinterCardItem } from './LinterCardItem';

/**
 * Main container for the Heuristic Analysis UI.
 * Subscribes to the global warden store and dynamically renders technical debt flags.
 * Now includes file targeting transparency and manual dismissal controls.
 */
export const LinterBoard: React.FC = () => {
    const { activeAnalysis, isAnalyzing, clearAnalysis } = useWardenStore();

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
                <button onClick={clearAnalysis} style={styles.dismissButton}>DISMISS</button>
            </div>
        );
    }

    // Extract filename from the full path for a cleaner header
    const fileName = activeAnalysis.target_file_path.split('\\').pop()?.split('/').pop() || 'Unknown File';

    return (
        <div style={styles.boardContainer}>
            <div style={styles.statsHeader}>
                <div style={styles.headerLeft}>
                    <span style={styles.fileName}>{fileName}</span>
                    <span style={styles.issueCount}>{activeAnalysis.cards.length} Issues</span>
                </div>
                <button onClick={clearAnalysis} style={styles.dismissButton}>
                    DISMISS
                </button>
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
        gap: '8px',
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
        alignItems: 'center',
        padding: '8px 16px',
        backgroundColor: THEME.panelHeader,
        borderBottom: `1px solid ${THEME.midnightPurple}`,
    },
    headerLeft: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px',
    },
    fileName: {
        color: THEME.textPrimary,
        fontSize: '11px',
        fontWeight: 'bold',
    },
    issueCount: {
        fontSize: '10px',
        color: THEME.neonCrimson,
        fontFamily: "'Fira Code', monospace",
    },
    dismissButton: {
        backgroundColor: 'transparent',
        border: `1px solid ${THEME.midnightPurple}`,
        color: THEME.textSecondary,
        fontSize: '10px',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    cardList: {
        flex: 1,
        padding: '16px',
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
    }
};