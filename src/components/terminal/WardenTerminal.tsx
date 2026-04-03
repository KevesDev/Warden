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
 * Terminal component utilizing xterm.js for high-performance rendering.
 * Reactive to the global workspace path to ensure native shell synchronization.
 */
export const WardenTerminal: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermInstance = useRef<Terminal | null>(null);
    const currentSessionId = useRef<number>(0);
    
    // Subscribe to the workspace path to drive shell re-initialization.
    const { activeWorkspacePath, setStatus } = useEditorStore();

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm.js with the Warden theme.
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
        
        // Initial layout adjustment.
        setTimeout(() => fitAddon.fit(), 0);
        xtermInstance.current = term;

        /**
         * Initialize the native shell via IPC.
         * The 'workspace_path' key is explicitly mapped to the Rust command parameter.
         */
        invoke<number>('spawn_pty', { workspace_path: activeWorkspacePath })
            .then((sessionId) => {
                currentSessionId.current = sessionId;
                SystemLogger.log(LogLevel.INFO, 'Terminal', `Terminal session ${sessionId} active.`);
            })
            .catch(err => {
                SystemLogger.log(LogLevel.ERROR, 'Terminal', 'PTY spawn failed', err);
                setStatus('Terminal initialization failed.');
                term.write('\r\n\x1b[31m[ERROR] Native shell failed to initialize.\x1b[0m\r\n');
            });

        // Bridge UI keystrokes to Rust.
        const dataListener = term.onData((data) => {
            invoke('write_pty', { data }).catch(() => {});
        });

        // Bridge Rust stdout to UI, filtering by session_id.
        const unlistenPromise = listen<PtyOutputPayload>('pty-output', (event) => {
            if (event.payload.session_id === currentSessionId.current) {
                term.write(event.payload.payload);
            }
        });

        // Dynamic resizing observer.
        const resizeObserver = new ResizeObserver(() => {
            if (xtermInstance.current) {
                fitAddon.fit();
                invoke('resize_pty', { 
                    rows: term.rows, 
                    cols: term.cols 
                }).catch(() => {});
            }
        });
        
        resizeObserver.observe(terminalRef.current);

        // Standard lifecycle cleanup.
        return () => {
            dataListener.dispose();
            unlistenPromise.then(u => u());
            resizeObserver.disconnect();
            term.dispose();
            SystemLogger.log(LogLevel.INFO, 'Terminal', 'Terminal session disposed.');
        };
    }, [activeWorkspacePath]);

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