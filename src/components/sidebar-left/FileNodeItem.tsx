import React from 'react';
import { FileNode } from '@core/contracts/FileTree';
import { useFileNode } from './hooks/useFileNode';
import { THEME } from '@core/constants/theme';

interface FileNodeItemProps {
    node: FileNode;
    depth: number;
}

/**
 * Individual entry in the File Explorer tree.
 * Correctly imports THEME from the constants directory.
 */
export const FileNodeItem: React.FC<FileNodeItemProps> = ({ node, depth }) => {
    const { isExpanded, isLoading, childrenNodes, isActive, handleInteraction } = useFileNode(node);

    return (
        <div>
            <div 
                onClick={handleInteraction}
                style={{
                    ...styles.nodeContainer,
                    paddingLeft: `${depth * 12 + 8}px`,
                    backgroundColor: isActive ? THEME.synthwaveViolet : 'transparent',
                    color: isActive ? '#FFFFFF' : THEME.textPrimary,
                }}
                title={node.path}
            >
                <span style={styles.icon}>
                    {node.is_directory ? (isExpanded ? '▼ ' : '▶ ') : '📄 '}
                </span>
                <span style={styles.fileName}>{node.name}</span>
            </div>

            {isExpanded && isLoading && (
                <div style={{ paddingLeft: `${(depth + 1) * 12 + 8}px`, color: THEME.textSecondary, fontSize: '12px' }}>
                    Loading...
                </div>
            )}

            {isExpanded && childrenNodes && (
                <div>
                    {childrenNodes.map((child) => (
                        <FileNodeItem key={child.path} node={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    nodeContainer: { display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', userSelect: 'none' as const, fontSize: '13px', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
    icon: { marginRight: '6px', fontSize: '11px', opacity: 0.8 },
    fileName: { overflow: 'hidden', textOverflow: 'ellipsis' }
};