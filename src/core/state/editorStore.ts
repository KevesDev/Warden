import { create } from 'zustand';
import { FileNode } from '@core/contracts/FileTree';
import { UiVisibilityState } from '@core/contracts/UiSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { FileOpsIPC } from '@services/rust-bridge/fileOpsIpc';

/**
 * Global state manager for the Warden IDE workspace.
 * Handles the workspace root, multi-file buffers, and UI visibility.
 * Strictly adheres to the 'Zero Assumption' rule by defining all utilized actions.
 */
interface EditorState extends UiVisibilityState {
    rootNode: FileNode | null;
    activeFilePath: string | null;
    openFiles: string[];
    // Memory buffers for open files: Map<filePath, content>
    fileBuffers: Map<string, string>;
    // Set of file paths that have unsaved changes
    dirtyFiles: Set<string>;

    // Actions
    setWorkspace: (node: FileNode | null) => void;
    setActiveFile: (filePath: string | null) => void;
    
    // Tab & Buffer Management
    openTab: (filePath: string) => void;
    hydrateBuffer: (filePath: string, content: string) => void;
    updateBuffer: (filePath: string, content: string) => void;
    closeTab: (filePath: string) => void;
    
    // UI & Feedback
    toggleTerminal: () => void;
    toggleWarden: () => void;
    setStatus: (message: string | null) => void;
    
    // Persistence
    saveActiveFile: () => Promise<void>;
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

    /**
     * Initializes or refreshes the entire workspace root.
     * Clears existing tabs and buffers to prevent stale data across different projects.
     */
    setWorkspace: (node) => {
        SystemLogger.log(LogLevel.INFO, 'EditorStore', 'Workspace refreshed.');
        set({ 
            rootNode: node,
            openFiles: [],
            fileBuffers: new Map(),
            dirtyFiles: new Set(),
            activeFilePath: null 
        });
    },

    setActiveFile: (filePath) => set({ activeFilePath: filePath }),

    setStatus: (message) => {
        set({ statusMessage: message });
        if (message) {
            // Transient messages auto-clear after 3 seconds
            setTimeout(() => {
                if (get().statusMessage === message) set({ statusMessage: null });
            }, 3000);
        }
    },

    /**
     * Adds a file to the tab list. 
     * Buffer hydration is handled lazily by the MonacoCanvas component.
     */
    openTab: (filePath) => {
        const { openFiles } = get();
        if (!openFiles.includes(filePath)) {
            set({ 
                openFiles: [...openFiles, filePath], 
                activeFilePath: filePath 
            });
        } else {
            set({ activeFilePath: filePath });
        }
    },

    /**
     * Fills the buffer with content from the disk.
     * Clears the dirty flag as the buffer now matches the disk state.
     */
    hydrateBuffer: (filePath, content) => {
        const { fileBuffers, dirtyFiles } = get();
        fileBuffers.set(filePath, content);
        dirtyFiles.delete(filePath);
        set({ 
            fileBuffers: new Map(fileBuffers), 
            dirtyFiles: new Set(dirtyFiles) 
        });
    },

    /**
     * Updates the in-memory buffer during user input.
     * Flags the file as 'dirty' to trigger unsaved changes indicators.
     */
    updateBuffer: (filePath, content) => {
        const { fileBuffers, dirtyFiles } = get();
        fileBuffers.set(filePath, content);
        dirtyFiles.add(filePath);
        set({ 
            fileBuffers: new Map(fileBuffers), 
            dirtyFiles: new Set(dirtyFiles) 
        });
    },

    /**
     * Removes a tab and clears its memory buffer.
     */
    closeTab: (filePath) => {
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

    /**
     * Writes the current buffer of the active file to the native disk.
     */
    saveActiveFile: async () => {
        const { activeFilePath, fileBuffers, hydrateBuffer, setStatus } = get();
        if (!activeFilePath) return;

        const content = fileBuffers.get(activeFilePath);
        if (content === undefined) return;

        try {
            const res = await FileOpsIPC.writeFile(activeFilePath, content);
            if (res.success) {
                // Buffer now matches disk
                hydrateBuffer(activeFilePath, content);
                setStatus('File saved.');
            }
        } catch (e) {
            SystemLogger.log(LogLevel.ERROR, 'EditorStore', `Save failed: ${activeFilePath}`, e);
            setStatus('Save failed.');
        }
    },

    /**
     * Bulk-saves all dirty buffers to the native disk.
     */
    saveAll: async () => {
        const { dirtyFiles, fileBuffers, hydrateBuffer, setStatus } = get();
        if (dirtyFiles.size === 0) {
            setStatus('Nothing to save.');
            return;
        }

        const pathsToSave = Array.from(dirtyFiles);
        let successCount = 0;

        setStatus(`Saving ${pathsToSave.length} files...`);

        for (const path of pathsToSave) {
            const content = fileBuffers.get(path);
            if (content !== undefined) {
                try {
                    const res = await FileOpsIPC.writeFile(path, content);
                    if (res.success) {
                        hydrateBuffer(path, content);
                        successCount++;
                    }
                } catch (e) {
                    SystemLogger.log(LogLevel.ERROR, 'EditorStore', `SaveAll failed for ${path}`, e);
                }
            }
        }

        setStatus(`Saved ${successCount} files.`);
    }
}));