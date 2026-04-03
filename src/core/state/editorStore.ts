import { create } from 'zustand';
import { FileNode } from '@core/contracts/FileTree';
import { UiVisibilityState } from '@core/contracts/UiSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { FileOpsIPC } from '@services/rust-bridge/fileOpsIpc';

/**
 * Global state manager for the Warden IDE workspace.
 * Manages the file tree, active buffers, and UI visibility states.
 * * ARCHITECTURAL DESIGN:
 * activeWorkspacePath is tracked as a first-class property to allow 
 * platform-agnostic services (like the Terminal) to reactively synchronize 
 * with the native filesystem context.
 */
interface EditorState extends UiVisibilityState {
    rootNode: FileNode | null;
    activeWorkspacePath: string | null;
    activeFilePath: string | null;
    openFiles: string[];
    fileBuffers: Map<string, string>;
    dirtyFiles: Set<string>;
    statusMessage: string | null;

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
    activeWorkspacePath: null,
    activeFilePath: null,
    openFiles: [],
    fileBuffers: new Map(),
    dirtyFiles: new Set(),
    isTerminalVisible: true,
    isWardenVisible: true,
    statusMessage: null,

    /**
     * Updates the workspace root and synchronizes the active path.
     * Triggers re-initialization of context-aware components (Terminal, Warden Engine).
     */
    setWorkspace: (node) => {
        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Workspace context updated to: ${node?.path || 'None'}`);
        set({ 
            rootNode: node,
            activeWorkspacePath: node?.path || null,
            openFiles: [],
            fileBuffers: new Map(),
            dirtyFiles: new Set(),
            activeFilePath: null 
        });
    },

    setActiveFile: (filePath) => set({ activeFilePath: filePath }),

    /**
     * Updates the IDE status bar with a transient message.
     */
    setStatus: (message) => {
        set({ statusMessage: message });
        if (message) {
            setTimeout(() => {
                if (get().statusMessage === message) set({ statusMessage: null });
            }, 3000);
        }
    },

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

    hydrateBuffer: (filePath, content) => {
        const { fileBuffers, dirtyFiles } = get();
        fileBuffers.set(filePath, content);
        dirtyFiles.delete(filePath);
        set({ 
            fileBuffers: new Map(fileBuffers), 
            dirtyFiles: new Set(dirtyFiles) 
        });
    },

    updateBuffer: (filePath, content) => {
        const { fileBuffers, dirtyFiles } = get();
        fileBuffers.set(filePath, content);
        dirtyFiles.add(filePath);
        set({ 
            fileBuffers: new Map(fileBuffers), 
            dirtyFiles: new Set(dirtyFiles) 
        });
    },

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

    saveActiveFile: async () => {
        const { activeFilePath, fileBuffers, hydrateBuffer, setStatus } = get();
        if (!activeFilePath) return;

        const content = fileBuffers.get(activeFilePath);
        if (content === undefined) return;

        try {
            const res = await FileOpsIPC.writeFile(activeFilePath, content);
            if (res.success) {
                hydrateBuffer(activeFilePath, content);
                setStatus('File saved.');
            }
        } catch (e) {
            SystemLogger.log(LogLevel.ERROR, 'EditorStore', `Save operation failed: ${activeFilePath}`, e);
            setStatus('Save failed.');
        }
    },

    saveAll: async () => {
        const { dirtyFiles, fileBuffers, hydrateBuffer, setStatus } = get();
        if (dirtyFiles.size === 0) return;

        const pathsToSave = Array.from(dirtyFiles);
        for (const path of pathsToSave) {
            const content = fileBuffers.get(path);
            if (content !== undefined) {
                try {
                    const res = await FileOpsIPC.writeFile(path, content);
                    if (res.success) hydrateBuffer(path, content);
                } catch (e) {
                    SystemLogger.log(LogLevel.ERROR, 'EditorStore', `Bulk save failed for: ${path}`, e);
                }
            }
        }
        setStatus('All changes saved.');
    }
}));