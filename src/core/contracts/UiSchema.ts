/**
 * Defines the structural requirements for the application's layout state.
 * saveRequestedAt acts as a cross-component signal for triggering file writes.
 */
export interface UiVisibilityState {
    isTerminalVisible: boolean;
    isWardenVisible: boolean;
    saveRequestedAt: number | null; 
}