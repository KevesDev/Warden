import React from 'react';
import { LinterCard, ErrorLevel } from '@core/contracts/WardenSchema';
import { THEME } from '@core/constants/theme';

interface LinterCardItemProps {
    card: LinterCard;
}

/**
 * Decoupled presentation component for a single Heuristic Analysis result.
 * Displays severity, line numbers, and the specific rule triggered by the Rust backend.
 */
export const LinterCardItem: React.FC<LinterCardItemProps> = ({ card }) => {
    // Map the severity to our centralized retro aesthetic theme
    const getBorderColor = (level: ErrorLevel) => {
        switch (level) {
            case ErrorLevel.Critical: return THEME.neonCrimson;
            case ErrorLevel.Warning: return THEME.retroPlasma;
            case ErrorLevel.Info: return THEME.cyberCyan;
            default: return THEME.midnightPurple;
        }
    };

    const borderColor = getBorderColor(card.level);

    return (
        <div style={{ ...styles.cardContainer, borderLeft: `3px solid ${borderColor}` }}>
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
        // Ensure long code snippets in messages wrap gracefully
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
    },
    suggestionBox: {
        marginTop: '4px',
        padding: '8px',
        backgroundColor: 'rgba(5, 217, 232, 0.05)', // Cyber Cyan tint
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