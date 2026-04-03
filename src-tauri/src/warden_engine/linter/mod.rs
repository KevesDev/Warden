pub mod rules;
pub mod entropy_scanner;
pub mod ast_analyzer;

use serde::{Deserialize, Serialize};

/**
 * Native schema for Heuristic engine results.
 * Implements strict Deserialization to allow parsing of local AI JSON output.
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinterCard {
    pub id: String,
    pub level: rules::ErrorLevel,
    pub line_start: usize,
    pub line_end: usize,
    pub message: String,
    pub rule_triggered: String,
    pub suggested_fix: Option<String>,
}