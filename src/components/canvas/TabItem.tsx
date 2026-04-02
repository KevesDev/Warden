import React from 'react';
import { useEditorStore } from '@core/state/editorStore';
import { THEME } from '@core/constants/theme';

interface TabItemProps {
    filePath: string;
}

/**
 * Renders an individual file tab.
 * Subscribes to the global Zustand store to determine active state and handle close events.
 */
export const TabItem: React.FC<TabItemProps> = ({ filePath }) => {
    const { activeFilePath, unsavedChanges, setActiveFile, closeFile } = useEditorStore();

    // Extract just the filename from the absolute path
    const fileName = filePath.split(/[\\/]/).pop() || 'Unknown File';
    
    const isActive = activeFilePath === filePath;
    // Per Sprint 0 constraints, unsavedChanges is global to the active file.
    const showUnsavedIndicator = isActive && unsavedChanges;

    const handleTabClick = () => {
        if (!isActive) {
            setActiveFile(filePath);
        }
    };

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent tab click from firing when closing
        closeFile(filePath);
    };

    return (
        <div 
            onClick={handleTabClick}
            style={{
                ...styles.tabContainer,
                backgroundColor: isActive ? THEME.deepVoid : THEME.midnightPurple,
                borderTop: isActive ? `2px solid ${THEME.retroPlasma}` : `2px solid transparent`,
                color: isActive ? THEME.textPrimary : THEME.textSecondary,
            }}
            title={filePath} // Hover to see full path
        >
            <span style={styles.fileName}>
                {fileName}
                {showUnsavedIndicator && <span style={styles.unsavedDot}> •</span>}
            </span>
            <button 
                onClick={handleCloseClick}
                style={{
                    ...styles.closeButton,
                    color: isActive ? THEME.textPrimary : THEME.textSecondary
                }}
                aria-label={`Close ${fileName}`}
            >
                ×
            </button>
        </div>
    );
};

const styles = {
    tabContainer: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        cursor: 'pointer',
        userSelect: 'none' as const,
        borderRight: `1px solid ${THEME.synthwaveViolet}`,
        minWidth: '120px',
        maxWidth: '200px',
    },
    fileName: {
        fontSize: '12px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        flex: 1,
    },
    unsavedDot: {
        color: THEME.retroPlasma,
        fontWeight: 'bold',
    },
    closeButton: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        marginLeft: '8px',
        padding: '0 4px',
        lineHeight: '12px',
    }
};