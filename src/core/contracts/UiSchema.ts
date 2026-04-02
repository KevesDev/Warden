/**
 * Defines the structural requirements for the application's layout state.
 * This contract ensures that UI visibility toggles remain consistent across the IDE shell.
 */
export interface UiVisibilityState {
    isTerminalVisible: boolean;
    isWardenVisible: boolean;
    saveRequestedAt: number | null; // Unix timestamp used as a trigger for editor save operations
}