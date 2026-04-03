import React from 'react';
import { LinterCard, ErrorLevel } from '@core/contracts/WardenSchema';
import { THEME } from '@core/constants/theme';
import { useWardenStore } from '@core/state/wardenStore';
import { useEditorStore } from '@core/state/editorStore';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

interface LinterCardItemProps {
    card: LinterCard;
}

/**
 * Decoupled presentation component for a single Heuristic Analysis result.
 * Now acts as an interactive navigational tool to focus the editor on the issue,
 * including seamless cross-tab switching if the issue is in a background file.
 */
export const LinterCardItem: React.FC<LinterCardItemProps> = ({ card }) => {
    const { focusIssue, focusedIssueId, activeAnalysis } = useWardenStore();
    const { activeFilePath, setActiveFile } = useEditorStore();
    
    const isFocused = focusedIssueId === card.id;

    const getBorderColor = (level: ErrorLevel) => {
        switch (level) {
            case ErrorLevel.Critical: return THEME.neonCrimson;
            case ErrorLevel.Warning: return THEME.retroPlasma;
            case ErrorLevel.Info: return THEME.cyberCyan;
            default: return THEME.midnightPurple;
        }
    };

    /**
     * Handles Kanban card clicks. Ensures the correct file is open 
     * before instructing the interceptor to snap the camera.
     */
    const handleNavigationClick = () => {
        try {
            if (activeAnalysis && activeAnalysis.target_file_path !== activeFilePath) {
                SystemLogger.log(LogLevel.INFO, 'LinterCardItem', `Switching active tab to: ${activeAnalysis.target_file_path}`);
                setActiveFile(activeAnalysis.target_file_path);
            }
            focusIssue(card.id);
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'LinterCardItem', 'Failed to navigate to issue.', error);
        }
    };

    const borderColor = getBorderColor(card.level);

    return (
        <div 
            onClick={handleNavigationClick}
            style={{ 
                ...styles.cardContainer, 
                borderLeft: `3px solid ${borderColor}`,
                // Apply a subtle visual lift if this is the currently focused issue
                backgroundColor: isFocused ? '#1D1429' : THEME.consoleDark,
                borderColor: isFocused ? THEME.cyberCyan : THEME.midnightPurple
            }}
        >
            <div style={styles.header}>
                <span style={{ ...styles.severityBadge, color: borderColor }}>
                    {card.level}
                </span>
                <span style={styles.lineNumbers}>
                    Lines: {card.line_start} - {card.line_end}
                </span>
            </div>
            
            <div style={styles.ruleTriggered}>
                Rule: {card.rule_triggered}
            </div>
            
            <div style={styles.message}>
                {card.message}
            </div>

            {card.suggested_fix && (
                <div style={styles.suggestionBox}>
                    <span style={styles.suggestionTitle}>Suggested Fix:</span>
                    <div style={styles.suggestionText}>{card.suggested_fix}</div>
                </div>
            )}
        </div>
    );
};

const styles = {
    cardContainer: {
        backgroundColor: THEME.consoleDark,
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '12px',
        border: `1px solid ${THEME.midnightPurple}`,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        cursor: 'pointer', // Indicates interactivity to the user
        transition: 'all 0.2s ease',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${THEME.midnightPurple}`,
        paddingBottom: '6px',
    },
    severityBadge: {
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '1px',
    },
    lineNumbers: {
        fontSize: '11px',
        color: THEME.textSecondary,
        fontFamily: "'Fira Code', monospace",
    },
    ruleTriggered: {
        fontSize: '11px',
        color: THEME.textSecondary,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
    },
    message: {
        fontSize: '13px',
        color: THEME.textPrimary,
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
    },
    suggestionBox: {
        marginTop: '4px',
        padding: '8px',
        backgroundColor: 'rgba(5, 217, 232, 0.05)', 
        borderLeft: `2px solid ${THEME.cyberCyan}`,
        borderRadius: '2px',
    },
    suggestionTitle: {
        fontSize: '10px',
        color: THEME.cyberCyan,
        textTransform: 'uppercase' as const,
        fontWeight: 'bold',
        marginBottom: '4px',
        display: 'block',
    },
    suggestionText: {
        fontSize: '12px',
        color: THEME.textSecondary,
        fontFamily: "'Fira Code', monospace",
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
    }
};