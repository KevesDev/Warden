import { useState } from 'react';
import { FileNode } from '@core/contracts/FileTree';
import { FileSystemIPC } from '@services/rust-bridge/fileSystemIpc';
import { useEditorStore } from '@core/state/editorStore';

export const useFileNode = (initialNode: FileNode) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [childrenNodes, setChildrenNodes] = useState<FileNode[] | null>(initialNode.children || null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Use openTab to decouple tab creation from disk hydration
    const { activeFilePath, openTab } = useEditorStore();
    const isActive = activeFilePath === initialNode.path;

    const handleInteraction = async () => {
        if (!initialNode.is_directory) {
            openTab(initialNode.path);
            return;
        }

        if (!isExpanded && !childrenNodes) {
            setIsLoading(true);
            try {
                const response = await FileSystemIPC.readDirectory(initialNode.path);
                setChildrenNodes(response.root_node.children || []);
            } catch (error) {
                console.error("Failed to hydrate folder", error);
            } finally {
                setIsLoading(false);
            }
        }
        setIsExpanded(!isExpanded);
    };

    return {
        isExpanded,
        isLoading,
        childrenNodes,
        isActive,
        handleInteraction
    };
};