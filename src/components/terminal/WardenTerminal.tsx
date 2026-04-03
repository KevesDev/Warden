import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/tauri';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { THEME } from '@core/constants/theme';
import { useEditorStore } from '@core/state/editorStore';

import 'xterm/css/xterm.css';

interface PtyOutputPayload {
    session_id: number;
    payload: string;
}

/**
 * Production-level terminal component utilizing xterm.js and a native PTY backend.
 * Safely guards against rendering lifecycle errors and properly scopes
 * OS sessions to the active workspace.
 */
export const WardenTerminal: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermInstance = useRef<Terminal | null>(null);
    const fitAddonInstance = useRef<FitAddon | null>(null);
    const currentSessionId = useRef<number>(0);
    
    const { activeWorkspacePath, setStatus } = useEditorStore();

    // UI Lifecycle: Mounts the terminal instance exactly once.
    useEffect(() => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontFamily: "'Fira Code', monospace",
            fontSize: 13,
            theme: {
                background: THEME.deepVoid,
                foreground: THEME.textPrimary,
                cursor: THEME.retroPlasma,
                selectionBackground: 'rgba(242, 89, 18, 0.3)',
                black: '#000000',
                red: THEME.neonCrimson,
                green: THEME.matrixGreen,
                yellow: THEME.retroPlasma,
                blue: THEME.cyberCyan,
                magenta: '#BD93F9',
                cyan: '#8BE9FD',
                white: '#BFBFBF',
            },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        
        xtermInstance.current = term;
        fitAddonInstance.current = fitAddon;

        /**
         * Calculates terminal layout geometry.
         * Guards against upstream rendering errors when the DOM container is temporarily
         * detached during React reflow cycles.
         */
        const calculateFit = () => {
            const container = terminalRef.current;
            if (!term || !fitAddon || !container) return;
            
            // Container must be physically present in the DOM with active dimensions
            if (container.clientWidth === 0 || container.clientHeight === 0) return;
            if (!document.body.contains(container)) return;

            try {
                fitAddon.fit();
                if (term.rows && term.cols) {
                    invoke('resize_pty', { rows: term.rows, cols: term.cols })
                        .catch((err) => {
                            SystemLogger.log(LogLevel.WARN, 'Terminal', 'PTY resize synchronization bypassed', err);
                        });
                }
            } catch (error) {
                SystemLogger.log(LogLevel.WARN, 'Terminal', 'Layout calculation bypassed during DOM reflow', error);
            }
        };

        const dataListener = term.onData((data) => {
            invoke('write_pty', { data })
                .catch((err) => {
                    SystemLogger.log(LogLevel.WARN, 'Terminal', 'Keystroke dispatch failed', err);
                });
        });

        const unlistenPromise = listen<PtyOutputPayload>('pty-output', (event) => {
            if (event.payload.session_id === currentSessionId.current) {
                term.write(event.payload.payload);
            }
        });

        const resizeObserver = new ResizeObserver(() => {
            calculateFit();
        });
        
        resizeObserver.observe(terminalRef.current);

        setTimeout(calculateFit, 100);

        return () => {
            dataListener.dispose();
            unlistenPromise.then(u => u());
            resizeObserver.disconnect();
            term.dispose();
            xtermInstance.current = null;
        };
    }, []);

    // Process Lifecycle: Drives the backend shell when the workspace changes.
    useEffect(() => {
        const spawnProcess = async () => {
            let attempts = 0;
            while (!xtermInstance.current && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
            }

            const term = xtermInstance.current;
            if (!term) return;
            
            // Generates a Unix timestamp for session tracking to prevent asynchronous IPC collisions.
            const newSessionId = Date.now();
            currentSessionId.current = newSessionId;
            
            term.clear();
            term.write('\x1b[36m[Warden] Synchronizing native shell...\x1b[0m\r\n');

            try {
                // Tauri maps Rust's snake_case parameters to camelCase JavaScript keys.
                // SessionID and workspacePath are mapped respectively to satisfy the macro bindings.
                await invoke('spawn_pty', { 
                    sessionId: newSessionId, 
                    workspacePath: activeWorkspacePath 
                });
                SystemLogger.log(LogLevel.INFO, 'Terminal', `Session ${newSessionId} anchored to: ${activeWorkspacePath || 'Root'}`);
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'Terminal', 'Native Shell Execution Error', err);
                setStatus('Terminal initialization failed.');
                term.write('\r\n\x1b[31m[ERROR] Native shell failed to initialize. Review system logs.\x1b[0m\r\n');
            }
        };

        spawnProcess();
    }, [activeWorkspacePath, setStatus]);

    return (
        <div style={styles.outerWrapper}>
            <div ref={terminalRef} style={styles.innerContainer} />
        </div>
    );
};

const styles = {
    outerWrapper: {
        width: '100%', 
        height: '100%', 
        backgroundColor: THEME.deepVoid,
        overflow: 'hidden',
        boxSizing: 'border-box' as const,
        display: 'flex',
    },
    innerContainer: {
        flex: 1,
        padding: '8px',
        overflow: 'hidden',
        position: 'relative' as const,
    }
};