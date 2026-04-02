import React from 'react';
import { useEditorStore } from '@core/state/editorStore';
import { TabItem } from './TabItem';
import { THEME } from '@core/constants/theme';

/**
 * Container for all open file tabs. 
 * Enables horizontal scrolling for managing 10+ open files smoothly.
 */
export const TabBar: React.FC = () => {
    const { openFiles } = useEditorStore();

    if (openFiles.length === 0) {
        return <div style={styles.emptyBar} />;
    }

    return (
        <div style={styles.barContainer}>
            {openFiles.map(filePath => (
                <TabItem key={filePath} filePath={filePath} />
            ))}
        </div>
    );
};

const styles = {
    emptyBar: {
        height: '35px',
        backgroundColor: THEME.midnightPurple,
        borderBottom: `1px solid ${THEME.synthwaveViolet}`,
    },
    barContainer: {
        display: 'flex',
        height: '35px',
        backgroundColor: THEME.midnightPurple,
        borderBottom: `1px solid ${THEME.synthwaveViolet}`,
        overflowX: 'auto' as const,
        overflowY: 'hidden' as const,
        // Hide scrollbar for a cleaner retro UI, while retaining scroll functionality
        scrollbarWidth: 'none' as const, 
    }
};