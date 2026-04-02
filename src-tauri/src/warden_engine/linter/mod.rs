use regex::Regex;
use serde::{Deserialize, Serialize};

// Maps to the TypeScript ErrorLevel enum
#[derive(Debug, Serialize, Deserialize)]
pub enum ErrorLevel {
    INFO,
    WARNING,
    CRITICAL,
}

// Maps to the TypeScript LinterCard interface
#[derive(Debug, Serialize, Deserialize)]
pub struct LinterCard {
    pub id: String,
    pub level: ErrorLevel,
    pub line_start: usize,
    pub line_end: usize,
    pub message: String,
    pub rule_triggered: String,
    pub suggested_fix: Option<String>,
}

/**
 * Executes a high-speed Regex pass over the specific text chunk.
 * Enforces production-ready code by flagging "lazy AI" habits.
 */
pub fn scan_for_mvp_tactics(file_path: &str, target_chunk: &str, start_line_offset: usize) -> Vec<LinterCard> {
    let mut cards = Vec::new();

    // Comprehensive pattern matching for standard MVP and "band-aid" LLM behaviors
    let mvp_regex = Regex::new(r"(?i)(\bTODO\b|\bFIXME\b|\bHACK\b|\[INSERT\s.*\]|PLACEHOLDER|\.\.\.rest of code)").unwrap();

    for (i, line) in target_chunk.lines().enumerate() {
        if let Some(mat) = mvp_regex.find(line) {
            let actual_line = start_line_offset + i; // Convert relative chunk line to absolute line

            let card = LinterCard {
                id: format!("linter-mvp-{}-{}", file_path, actual_line),
                level: ErrorLevel::WARNING,
                line_start: actual_line,
                line_end: actual_line,
                message: format!("MVP/Placeholder tactic detected: '{}'. Code must be production-ready.", mat.as_str()),
                rule_triggered: "ZERO_MVP_TACTICS".to_string(),
                suggested_fix: Some("Implement the required logic fully instead of leaving a placeholder comment.".to_string()),
            };

            cards.push(card);
        }
    }

    cards
}