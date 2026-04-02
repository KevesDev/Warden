import { create } from 'zustand';

/**
 * Interface defining the global state for the application's UI shell visibility.
 */
interface UIState {
    isTerminalVisible: boolean;
    isWardenVisible: boolean;

    // Actions
    toggleTerminal: () => void;
    toggleWarden: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isTerminalVisible: true,
    isWardenVisible: true,

    toggleTerminal: () => set((state) => ({ isTerminalVisible: !state.isTerminalVisible })),
    toggleWarden: () => set((state) => ({ isWardenVisible: !state.isWardenVisible })),
}));