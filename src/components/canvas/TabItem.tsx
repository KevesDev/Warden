import React from 'react';
import { useEditorStore } from '@core/state/editorStore';
import { THEME } from '@core/constants/theme';

interface TabItemProps {
    filePath: string;
}

/**
 * Individual file tab component.
 * Subscribes to the dirtyFiles set to display unsaved change indicators.
 */
export const TabItem: React.FC<TabItemProps> = ({ filePath }) => {
    // Audit: Ensuring all destructured properties are defined in EditorState
    const { activeFilePath, dirtyFiles, setActiveFile, closeTab } = useEditorStore();

    const fileName = filePath.split(/[\\/]/).pop() || 'Unknown File';
    const isActive = activeFilePath === filePath;
    const isDirty = dirtyFiles.has(filePath);

    const handleTabClick = () => {
        if (!isActive) {
            setActiveFile(filePath);
        }
    };

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        closeTab(filePath);
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
            title={filePath} 
        >
            <span style={styles.fileName}>
                {fileName}
                {isDirty && <span style={styles.unsavedDot}> •</span>}
            </span>
            <button 
                onClick={handleCloseClick}
                style={{
                    ...styles.closeButton,
                    color: isActive ? THEME.textPrimary : THEME.textSecondary
                }}
            >
                ×
            </button>
        </div>
    );
};

const styles = {
    tabContainer: { display: 'flex', alignItems: 'center', padding: '6px 12px', cursor: 'pointer', userSelect: 'none' as const, borderRight: `1px solid ${THEME.synthwaveViolet}`, minWidth: '120px', maxWidth: '200px' },
    fileName: { fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 },
    unsavedDot: { color: THEME.retroPlasma, fontWeight: 'bold' },
    closeButton: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', marginLeft: '8px', padding: '0 4px', lineHeight: '12px' }
};