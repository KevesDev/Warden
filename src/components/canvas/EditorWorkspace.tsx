import React from 'react';
import { TabBar } from './TabBar';
import { MonacoCanvas } from './MonacoCanvas';
import { THEME } from '@core/constants/theme';

/**
 * Isolated workspace for code editing.
 * Decoupled from the layout shell to prevent initialization loops.
 */
export const EditorWorkspace: React.FC = () => {
    return (
        <div style={styles.container}>
            <TabBar />
            <MonacoCanvas />
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        width: '100%',
        backgroundColor: THEME.deepVoid,
    }
};