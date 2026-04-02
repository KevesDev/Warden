/**
 * Defines the structural requirements for the application's layout state.
 */
export interface UiVisibilityState {
    isTerminalVisible: boolean;
    isWardenVisible: boolean;
    // Transient message for the Status Bar
    statusMessage: string | null;
}