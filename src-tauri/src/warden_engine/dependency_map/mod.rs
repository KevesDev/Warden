use super::linter::{LinterCard, ErrorLevel};
use regex::Regex;
use std::collections::HashSet;

/**
 * Production-level Lexical Analyzer for dependency verification.
 * Cross-references pasted code against the active in-memory file buffer.
 * Flags external dependencies that are invoked by the LLM but not imported.
 */
pub fn scan_for_hallucinations(
    file_path: &str, 
    full_file_buffer: &str, 
    target_chunk: &str, 
    start_line_offset: usize
) -> Vec<LinterCard> {
    let mut cards = Vec::new();

    // 1. Extract valid imports from the ENTIRE file buffer (Dynamic context)
    // Matches patterns like: import { A, B } from 'X'; and import Default from 'X';
    let import_regex = Regex::new(r"(?m)^import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))\s+from").unwrap();
    let mut valid_scope = HashSet::new();

    for cap in import_regex.captures_iter(full_file_buffer) {
        // Handle destructured imports: { A, B as C }
        if let Some(destructured) = cap.get(1) {
            for item in destructured.as_str().split(',') {
                let cleaned = item.trim().split_whitespace().next().unwrap_or("");
                if !cleaned.is_empty() {
                    valid_scope.insert(cleaned.to_string());
                }
            }
        }
        // Handle default imports: DefaultName
        if let Some(default_import) = cap.get(2) {
            valid_scope.insert(default_import.as_str().to_string());
        }
    }

    // Inject standard browser/JS globals that do not require explicit importing
    let globals = ["console", "Math", "JSON", "Object", "Array", "Promise", "window", "document", "React"];
    for g in globals.iter() {
        valid_scope.insert(g.to_string());
    }

    // 2. Extract local definitions from the PASTED chunk to prevent false positives
    let local_def_regex = Regex::new(r"\b(?:const|let|var|function|class)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\b").unwrap();
    let mut local_defs = HashSet::new();
    for cap in local_def_regex.captures_iter(target_chunk) {
        if let Some(matched) = cap.get(1) {
            local_defs.insert(matched.as_str().to_string());
        }
    }

    // 3. Identify functional invocations and component usage in the PASTED chunk
    // Matches React components <Component... or standard function calls func(
    let invocation_regex = Regex::new(r"(?:<([A-Z][a-zA-Z0-9_$]*))|\b([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(").unwrap();

    for (i, line) in target_chunk.lines().enumerate() {
        for cap in invocation_regex.captures_iter(line) {
            // Determine if it matched a Component (group 1) or a function (group 2)
            let identifier = cap.get(1).or_else(|| cap.get(2)).map(|m| m.as_str()).unwrap_or("");

            if identifier.is_empty() {
                continue;
            }

            // Exclude common language control-flow keywords that use parentheses
            let keywords = ["if", "for", "while", "switch", "catch", "return", "super", "function"];
            if keywords.contains(&identifier) {
                continue;
            }

            // Cross-Reference: If the identifier is NOT imported, NOT defined locally, and NOT a global -> Flag it
            if !valid_scope.contains(identifier) && !local_defs.contains(identifier) {
                let actual_line = start_line_offset + i; // Translate chunk line to absolute file line

                cards.push(LinterCard {
                    id: format!("ast-halluc-{}-{}", actual_line, identifier),
                    level: ErrorLevel::CRITICAL,
                    line_start: actual_line,
                    line_end: actual_line,
                    message: format!("Unresolved dependency: '{}'. This symbol is invoked but neither imported in the file nor defined in this block.", identifier),
                    rule_triggered: "UNRESOLVED_DEPENDENCY".to_string(),
                    suggested_fix: Some(format!("Import '{}' from its source module or define it locally.", identifier)),
                });
            }
        }
    }

    cards
}