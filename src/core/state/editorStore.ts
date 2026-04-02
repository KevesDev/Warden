import { create } from 'zustand';
import { UiVisibilityState } from '@core/contracts/UiSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Global state manager for the Warden IDE workspace.
 * Strictly adheres to the 'Zero Assumption' rule by tracking both file data and UI visibility.
 */
interface EditorState extends UiVisibilityState {
    activeFilePath: string | null;
    unsavedChanges: boolean;
    openFiles: string[];

    // Actions
    setActiveFile: (filePath: string) => void;
    setUnsavedChanges: (hasChanges: boolean) => void;
    openFile: (filePath: string) => void;
    closeFile: (filePath: string) => void;
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
        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Active file changed to: ${filePath}`);
        set({ activeFilePath: filePath });
    },

    setUnsavedChanges: (hasChanges: boolean) => {
        set({ unsavedChanges: hasChanges });
    },

    openFile: (filePath: string) => {
        const currentFiles = get().openFiles;
        if (!currentFiles.includes(filePath)) {
            SystemLogger.log(LogLevel.INFO, 'EditorStore', `Adding file to workspace: ${filePath}`);
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
        }

        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Closing file: ${filePath}`);
        set({ openFiles: newFiles, activeFilePath: newActivePath, unsavedChanges: false });
    },

    toggleTerminal: () => {
        const nextState = !get().isTerminalVisible;
        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Terminal visibility toggled: ${nextState}`);
        set({ isTerminalVisible: nextState });
    },

    toggleWarden: () => {
        const nextState = !get().isWardenVisible;
        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Warden Sidebar visibility toggled: ${nextState}`);
        set({ isWardenVisible: nextState });
    },
    
    requestSave: () => {
        SystemLogger.log(LogLevel.INFO, 'EditorStore', 'Manual save requested via system menu.');
        set({ saveRequestedAt: Date.now() });
    },
}));