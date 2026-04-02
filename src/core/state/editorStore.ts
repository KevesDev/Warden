import { create } from 'zustand';
import { UiVisibilityState } from '@core/contracts/UiSchema';

/**
 * Global state manager for the Warden IDE workspace.
 * Manages file buffers, tab states, and layout visibility flags.
 */
interface EditorState extends UiVisibilityState {
    activeFilePath: string | null;
    unsavedChanges: boolean;
    openFiles: string[];

    // File Actions
    setActiveFile: (filePath: string) => void;
    setUnsavedChanges: (hasChanges: boolean) => void;
    openFile: (filePath: string) => void;
    closeFile: (filePath: string) => void;
    
    // UI Actions
    toggleTerminal: () => void;
    toggleWarden: () => void;
    requestSave: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    activeFilePath: null,
    unsavedChanges: false,
    openFiles: [],
    isTerminalVisible: true,
    isWardenVisible: true,
    saveRequestedAt: null,

    setActiveFile: (filePath: string) => {
        set({ activeFilePath: filePath });
    },

    setUnsavedChanges: (hasChanges: boolean) => {
        set({ unsavedChanges: hasChanges });
    },

    openFile: (filePath: string) => {
        const currentFiles = get().openFiles;
        if (!currentFiles.includes(filePath)) {
            set({ openFiles: [...currentFiles, filePath], activeFilePath: filePath });
        } else {
            set({ activeFilePath: filePath });
        }
    },

    closeFile: (filePath: string) => {
        const currentFiles = get().openFiles;
        const newFiles = currentFiles.filter(f => f !== filePath);
        
        let newActivePath = get().activeFilePath;
        if (newActivePath === filePath) {
            newActivePath = newFiles.length > 0 ? newFiles[newFiles.length - 1] : null;
            set({ unsavedChanges: false }); 
        }

        set({ openFiles: newFiles, activeFilePath: newActivePath });
    },

    toggleTerminal: () => set((state) => ({ isTerminalVisible: !state.isTerminalVisible })),
    toggleWarden: () => set((state) => ({ isWardenVisible: !state.isWardenVisible })),
    
    /**
     * Updates the saveRequestedAt timestamp to trigger an effect within the active editor canvas.
     */
    requestSave: () => set({ saveRequestedAt: Date.now() }),
}));