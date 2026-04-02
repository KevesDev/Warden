import React from 'react';
import { TabBar } from './TabBar';
import { MonacoCanvas } from './MonacoCanvas';
import { THEME } from '@components/layout/WorkspaceLayout';

/**
 * A decoupled container specifically managing the Tab UI and Monaco Editor relationship.
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