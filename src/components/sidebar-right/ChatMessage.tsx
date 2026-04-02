import React from 'react';
import { ChatMessageData } from '@core/contracts/ChatSchema';
import { THEME } from '@core/constants/theme';

interface ChatMessageProps {
    message: ChatMessageData;
}

/**
 * Presentation component for individual chat bubbles.
 * Implements robust CSS word-wrapping to ensure long code strings
 * or URLs do not break the sidebar flex layout.
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div style={{
            ...styles.messageWrapper,
            justifyContent: isUser ? 'flex-end' : 'flex-start'
        }}>
            <div style={{
                ...styles.messageBubble,
                backgroundColor: isUser ? THEME.retroPlasma : THEME.deepVoid,
                color: isUser ? '#FFFFFF' : THEME.textPrimary,
                border: isUser ? 'none' : `1px solid ${THEME.midnightPurple}`
            }}>
                <div style={styles.header}>
                    <span style={styles.roleLabel}>{isUser ? 'YOU' : 'WARDEN AI'}</span>
                </div>
                <div style={styles.content}>
                    {message.content}
                </div>
            </div>
        </div>
    );
};

const styles = {
    messageWrapper: {
        display: 'flex',
        width: '100%',
        marginBottom: '16px',
    },
    messageBubble: {
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    header: {
        marginBottom: '6px',
        fontSize: '11px',
        opacity: 0.7,
        fontWeight: 'bold',
        letterSpacing: '0.5px'
    },
    roleLabel: {
        textTransform: 'uppercase' as const,
    },
    content: {
        fontSize: '13px',
        lineHeight: '1.5',
        fontFamily: "'Fira Code', monospace",
        // Graceful Word Wrapping
        // Ensures long, unbroken strings wrap cleanly inside the bounded panel.
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
        overflowWrap: 'break-word' as const,
    }
};