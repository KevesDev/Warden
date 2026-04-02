use regex::Regex;
use serde::{Deserialize, Serialize};

// Mirrors the TypeScript ErrorLevel enum
#[derive(Debug, Serialize, Deserialize)]
pub enum ErrorLevel {
    INFO,
    WARNING,
    CRITICAL,
}

// Mirrors the TypeScript LinterCard interface
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
 * Executes a high-speed Regex pass over the provided text chunk.
 * Flags "lazy AI" habits like TODOs, FIXMEs, and generic placeholders.
 */
pub fn scan_for_mvp_tactics(file_path: &str, content: &str, start_line_offset: usize) -> Vec<LinterCard> {
    let mut cards = Vec::new();

    // Regex pattern looking for standard MVP and "band-aid" comments
    let mvp_regex = Regex::new(r"(?i)(TODO|FIXME|HACK|\[INSERT\s.*\]|PLACEHOLDER)").unwrap();

    for (i, line) in content.lines().enumerate() {
        if let Some(mat) = mvp_regex.find(line) {
            let actual_line = start_line_offset + i + 1; // 1-based indexing for UI

            let card = LinterCard {
                id: format!("linter-mvp-{}-{}", file_path, actual_line),
                level: ErrorLevel::WARNING,
                line_start: actual_line,
                line_end: actual_line,
                message: format!("MVP or Placeholder tactic detected: '{}'. Code must be production-ready.", mat.as_str()),
                rule_triggered: "ZERO_MVP_TACTICS".to_string(),
                suggested_fix: Some("Implement the required logic fully instead of leaving a comment.".to_string()),
            };

            cards.push(card);
        }
    }

    cards
}