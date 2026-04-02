import { create } from 'zustand';
import { UiVisibilityState } from '@core/contracts/UiSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Primary state manager for the IDE workspace.
 * Tracks file buffers, active tabs, and UI visibility flags.
 * Includes audit logging for all critical state transitions.
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
        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Active file target changed: ${filePath}`);
        set({ activeFilePath: filePath });
    },

    setUnsavedChanges: (hasChanges: boolean) => {
        set({ unsavedChanges: hasChanges });
    },

    openFile: (filePath: string) => {
        const currentFiles = get().openFiles;
        if (!currentFiles.includes(filePath)) {
            SystemLogger.log(LogLevel.INFO, 'EditorStore', `New file buffer opened: ${filePath}`);
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

        SystemLogger.log(LogLevel.INFO, 'EditorStore', `File buffer closed: ${filePath}`);
        set({ openFiles: newFiles, activeFilePath: newActivePath, unsavedChanges: false });
    },

    toggleTerminal: () => {
        const newState = !get().isTerminalVisible;
        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Terminal visibility toggled: ${newState}`);
        set({ isTerminalVisible: newState });
    },

    toggleWarden: () => {
        const newState = !get().isWardenVisible;
        SystemLogger.log(LogLevel.INFO, 'EditorStore', `Warden Sidebar visibility toggled: ${newState}`);
        set({ isWardenVisible: newState });
    },
    
    requestSave: () => {
        SystemLogger.log(LogLevel.INFO, 'EditorStore', 'Global Save request issued via System Menu.');
        set({ saveRequestedAt: Date.now() });
    },
}));