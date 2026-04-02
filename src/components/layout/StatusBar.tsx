import React from 'react';
import { useEditorStore } from '@core/state/editorStore';
import { THEME } from '@core/constants/theme';

export const StatusBar: React.FC = () => {
    const { statusMessage, dirtyFiles, activeFilePath } = useEditorStore();

    return (
        <div style={styles.bar}>
            <div style={styles.left}>
                {statusMessage || 'Ready'}
            </div>
            <div style={styles.right}>
                {dirtyFiles.size > 0 && (
                    <span style={styles.dirtyCount}>{dirtyFiles.size} unsaved changes</span>
                )}
                {activeFilePath && (
                    <span style={styles.path}>{activeFilePath}</span>
                )}
            </div>
        </div>
    );
};

const styles = {
    bar: { height: '22px', backgroundColor: THEME.midnightPurple, borderTop: `1px solid ${THEME.synthwaveViolet}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', fontSize: '11px', color: THEME.textSecondary },
    left: { whiteSpace: 'nowrap' as const, overflow: 'hidden' },
    right: { display: 'flex', gap: '15px' },
    dirtyCount: { color: THEME.retroPlasma, fontWeight: 'bold' },
    path: { opacity: 0.7 }
};