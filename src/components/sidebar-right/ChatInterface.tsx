import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@core/state/chatStore';
import { useWardenStore } from '@core/state/wardenStore';
import { LlmOrchestrator } from '@services/llm-api/LlmOrchestrator';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { THEME } from '@core/constants/theme';
import { ChatMessage } from './ChatMessage';

/**
 * Main AI Chat Interface for the right sidebar.
 * Handles user input and consumes the async stream from the LlmOrchestrator,
 * securely mutating the global store independently of the API layer.
 */
export const ChatInterface: React.FC = () => {
    const [inputValue, setInputValue] = useState('');
    const { messages, addMessage } = useChatStore();
    
    // Extract stream actions from Warden Store directly
    const { isStreaming, startStream, appendStreamChunk, endStream } = useWardenStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /**
     * Handles user submission, appends the message, and consumes the Orchestrator stream.
     */
    const handleSend = async () => {
        if (!inputValue.trim() || isStreaming) return;

        const currentInput = inputValue.trim();
        setInputValue('');

        try {
            // 1. Setup Chat UI
            addMessage('user', currentInput);
            addMessage('assistant', 'Generating code injection...');

            // 2. Lock the UI and initialize the stream buffer
            startStream();

            // 3. Consume the agnostic async generator and pipe it to the Store
            const stream = LlmOrchestrator.streamResponse(currentInput);
            for await (const chunk of stream) {
                appendStreamChunk(chunk);
            }
            
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'ChatInterface', 'Failed to dispatch AI message via Orchestrator.', error);
        } finally {
            // Guarantee the UI unlocks and the Rust IPC boundary triggers
            endStream();
        }
    };

    /**
     * Robust interruption mechanism. Delegates the abort command to the Orchestrator.
     */
    const handleStop = () => {
        try {
            LlmOrchestrator.abortStream();
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'ChatInterface', 'Failed to abort stream.', error);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>WARDEN TERMINAL</span>
            </div>

            <div style={styles.messageList}>
                {messages.length === 0 ? (
                    <div style={styles.emptyState}>No active session.</div>
                ) : (
                    messages.map(msg => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputArea}>
                {isStreaming && (
                    <button onClick={handleStop} style={styles.stopButton}>
                        STOP GENERATION
                    </button>
                )}
                
                <textarea 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder={isStreaming ? "AI is typing..." : "Request code..."}
                    disabled={isStreaming}
                    style={styles.textArea}
                />
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        backgroundColor: THEME.deepVoid,
        borderLeft: `1px solid ${THEME.midnightPurple}`,
    },
    header: {
        padding: '12px 16px',
        borderBottom: `1px solid ${THEME.midnightPurple}`,
        backgroundColor: THEME.panelHeader,
    },
    title: {
        color: THEME.textSecondary,
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '1px'
    },
    messageList: {
        flex: 1,
        padding: '16px',
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
    },
    emptyState: {
        margin: 'auto',
        color: THEME.textSecondary,
        fontSize: '13px',
        opacity: 0.5,
    },
    inputArea: {
        padding: '16px',
        borderTop: `1px solid ${THEME.midnightPurple}`,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    },
    textArea: {
        width: '100%',
        minHeight: '60px',
        maxHeight: '150px',
        backgroundColor: THEME.consoleDark,
        border: `1px solid ${THEME.midnightPurple}`,
        borderRadius: '4px',
        color: THEME.textPrimary,
        padding: '10px',
        fontSize: '13px',
        fontFamily: "'Fira Code', monospace",
        resize: 'vertical' as const,
        outline: 'none',
    },
    stopButton: {
        backgroundColor: THEME.neonCrimson,
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 0',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
    }
};