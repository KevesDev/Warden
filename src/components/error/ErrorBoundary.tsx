import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { THEME } from '@core/constants/theme';

interface Props { children: ReactNode; }
interface State { hasError: boolean; errorMessage: string | null; }

/**
 * High-level component to intercept runtime crashes and provide a themed recovery UI.
 * Strictly adheres to the 'Robust Error Handling' rule.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false, errorMessage: null };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        SystemLogger.log(LogLevel.ERROR, 'ErrorBoundary', 'Critical React component crash', {
            error: error.toString(),
            componentStack: errorInfo.componentStack
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={styles.container}>
                    <div style={styles.content}>
                        <h1 style={styles.header}>SYSTEM FAULT DETECTED</h1>
                        <p style={styles.message}>{this.state.errorMessage}</p>
                        <button style={styles.button} onClick={() => window.location.reload()}>
                            ATTEMPT REBOOT
                        </button>
                    </div>
                </div>
            );
        }
        return this.children;
    }
}

const styles = {
    container: {
        height: '100vh',
        width: '100vw',
        backgroundColor: THEME.deepVoid,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
    },
    content: {
        textAlign: 'center' as const,
        border: `2px solid ${THEME.retroPlasma}`,
        padding: '40px',
        backgroundColor: THEME.midnightPurple,
    },
    header: { color: THEME.retroPlasma, fontSize: '24px', marginBottom: '20px' },
    message: { color: THEME.textPrimary, fontSize: '14px', marginBottom: '30px' },
    button: {
        backgroundColor: THEME.retroPlasma,
        color: '#FFFFFF',
        border: 'none',
        padding: '10px 20px',
        cursor: 'pointer',
        fontWeight: 'bold'
    }
};