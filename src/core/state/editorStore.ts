import { create } from 'zustand';
import { FileNode } from '@core/contracts/FileTree';
import { UiVisibilityState } from '@core/contracts/UiSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { FileOpsIPC } from '@services/rust-bridge/fileOpsIpc';

/**
 * Global state manager for the Warden IDE workspace.
 * Manages the workspace root, active file buffers, and UI visibility.
 */
interface EditorState extends UiVisibilityState {
    // Workspace Data
    rootNode: FileNode | null;
    activeFilePath: string | null;
    openFiles: string[];
    // Maps filePath -> content string
    fileBuffers: Map<string, string>;
    // Set of filePaths that have unsaved changes
    dirtyFiles: Set<string>;

    // Actions
    setRootNode: (node: FileNode | null) => void;
    setActiveFile: (filePath: string | null) => void;
    updateBuffer: (filePath: string, content: string) => void;
    openFile: (filePath: string, content: string) => void;
    closeFile: (filePath: string) => void;
    
    // UI Actions
    toggleTerminal: () => void;
    toggleWarden: () => void;
    setStatus: (message: string | null) => void;
    
    // Bulk Operations
    saveAll: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    rootNode: null,
    activeFilePath: null,
    openFiles: [],
    fileBuffers: new Map(),
    dirtyFiles: new Set(),
    isTerminalVisible: true,
    isWardenVisible: true,
    statusMessage: null,

    setRootNode: (node) => set({ rootNode: node }),

    setActiveFile: (filePath) => set({ activeFilePath: filePath }),

    setStatus: (message) => {
        set({ statusMessage: message });
        if (message) {
            // Auto-clear transient status after 3 seconds
            setTimeout(() => {
                if (get().statusMessage === message) set({ statusMessage: null });
            }, 3000);
        }
    },

    updateBuffer: (filePath, content) => {
        const { fileBuffers, dirtyFiles } = get();
        fileBuffers.set(filePath, content);
        dirtyFiles.add(filePath);
        set({ fileBuffers: new Map(fileBuffers), dirtyFiles: new Set(dirtyFiles) });
    },

    openFile: (filePath, content) => {
        const { openFiles, fileBuffers } = get();
        if (!openFiles.includes(filePath)) {
            fileBuffers.set(filePath, content);
            set({ 
                openFiles: [...openFiles, filePath], 
                fileBuffers: new Map(fileBuffers),
                activeFilePath: filePath 
            });
        } else {
            set({ activeFilePath: filePath });
        }
    },

    closeFile: (filePath) => {
        const { openFiles, fileBuffers, dirtyFiles, activeFilePath } = get();
        const newFiles = openFiles.filter(f => f !== filePath);
        fileBuffers.delete(filePath);
        dirtyFiles.delete(filePath);
        
        let nextActive = activeFilePath;
        if (activeFilePath === filePath) {
            nextActive = newFiles.length > 0 ? newFiles[newFiles.length - 1] : null;
        }

        set({ 
            openFiles: newFiles, 
            fileBuffers: new Map(fileBuffers), 
            dirtyFiles: new Set(dirtyFiles),
            activeFilePath: nextActive 
        });
    },

    toggleTerminal: () => set((state) => ({ isTerminalVisible: !state.isTerminalVisible })),
    toggleWarden: () => set((state) => ({ isWardenVisible: !state.isWardenVisible })),

    saveAll: async () => {
        const { dirtyFiles, fileBuffers, setStatus } = get();
        if (dirtyFiles.size === 0) return;

        const pathsToSave = Array.from(dirtyFiles);
        let successCount = 0;

        setStatus(`Saving ${pathsToSave.length} files...`);

        for (const path of pathsToSave) {
            const content = fileBuffers.get(path);
            if (content !== undefined) {
                try {
                    const res = await FileOpsIPC.writeFile(path, content);
                    if (res.success) successCount++;
                } catch (e) {
                    SystemLogger.log(LogLevel.ERROR, 'EditorStore', `SaveAll failed for ${path}`, e);
                }
            }
        }

        // Refresh dirty set
        const newDirty = new Set(get().dirtyFiles);
        pathsToSave.forEach(p => newDirty.delete(p));
        
        set({ dirtyFiles: newDirty });
        setStatus(`Saved ${successCount} files.`);
    }
}));