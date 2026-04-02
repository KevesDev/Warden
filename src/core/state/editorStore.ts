import { create } from 'zustand';

/**
 * Interface defining the global state for the editor's workspace.
 * Strictly adheres to the Sprint 0 State Schema contract.
 */
interface EditorState {
    activeFilePath: string | null;
    unsavedChanges: boolean;
    openFiles: string[];

    // Actions
    setActiveFile: (filePath: string) => void;
    setUnsavedChanges: (hasChanges: boolean) => void;
    openFile: (filePath: string) => void;
    closeFile: (filePath: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
    activeFilePath: null,
    unsavedChanges: false,
    openFiles: [],

    /**
     * Sets the currently active file in the Monaco Canvas.
     */
    setActiveFile: (filePath: string) => {
        set({ activeFilePath: filePath });
    },

    /**
     * Flags whether the currently active file has unsaved modifications.
     */
    setUnsavedChanges: (hasChanges: boolean) => {
        set({ unsavedChanges: hasChanges });
    },

    /**
     * Adds a file to the open tabs array. Sets it as active.
     */
    openFile: (filePath: string) => {
        const currentFiles = get().openFiles;
        if (!currentFiles.includes(filePath)) {
            set({ openFiles: [...currentFiles, filePath], activeFilePath: filePath });
        } else {
            set({ activeFilePath: filePath });
        }
    },

    /**
     * Closes a file, removing it from open tabs.
     * If the closed file was active, it attempts to set the previous tab in the array as active.
     */
    closeFile: (filePath: string) => {
        const currentFiles = get().openFiles;
        const newFiles = currentFiles.filter(f => f !== filePath);
        
        let newActivePath = get().activeFilePath;
        if (newActivePath === filePath) {
            newActivePath = newFiles.length > 0 ? newFiles[newFiles.length - 1] : null;
            // Note: The UI component must handle the "Save changes?" prompt before calling closeFile.
            set({ unsavedChanges: false }); 
        }

        set({ openFiles: newFiles, activeFilePath: newActivePath });
    }
}));