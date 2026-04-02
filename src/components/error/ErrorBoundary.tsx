import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { THEME } from '@core/constants/theme';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false, error: null };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        SystemLogger.log(LogLevel.ERROR, 'ErrorBoundary', 'React Crash', {
            error: error.toString(),
            stack: errorInfo.componentStack
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={styles.crash}>
                    <h1 style={styles.header}>SYSTEM CRITICAL ERROR</h1>
                    <pre style={styles.text}>{this.state.error?.message}</pre>
                    <button onClick={() => window.location.reload()} style={styles.btn}>REBOOT</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const styles = {
    crash: { height: '100vh', backgroundColor: THEME.deepVoid, color: THEME.retroPlasma, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const },
    header: { fontSize: '24px', marginBottom: '10px' },
    text: { color: THEME.textPrimary, fontSize: '14px', marginBottom: '20px' },
    btn: { backgroundColor: THEME.retroPlasma, color: '#FFF', border: 'none', padding: '10px 20px', cursor: 'pointer' }
};