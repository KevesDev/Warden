/**
 * Represents the severity level of an issue caught by the Warden Engine.
 */
export enum ErrorLevel {
    Info = 'INFO',
    Warning = 'WARNING',
    Critical = 'CRITICAL'
}

/**
 * Represents a single actionable UI card in the Analysis Window.
 */
export interface LinterCard {
    id: string;
    level: ErrorLevel;
    line_start: number;
    line_end: number;
    message: string;
    rule_triggered: string;
    suggested_fix?: string;
}

/**
 * The complete payload returned by the Rust Warden Engine after analyzing a file or chunk.
 */
export interface WardenAnalysisResult {
    target_file_path: string;
    cards: LinterCard[];
    is_clean: boolean;
    execution_time_ms: number;
}