pub mod rules;

use rules::{RuleRegistry, RuleCategory, Severity};
use serde::Serialize;
use std::sync::Arc;

/**
 * Payload sent to the frontend containing precise coordinates
 * for the Monaco Editor to render visual squiggles.
 */
#[derive(Debug, Clone, Serialize)]
pub struct LinterIssue {
    pub rule_id: String,
    pub category: RuleCategory,
    pub severity: Severity,
    pub description: String,
    pub line_number: usize,
    pub column_start: usize,
    pub column_end: usize,
    pub snippet: String,
}

/**
 * The execution engine for Warden's heuristic analysis.
 * Operates independently of the UI and FileSystem, purely analyzing text buffers
 * against the pre-compiled RuleRegistry.
 */
pub struct WardenLinter {
    registry: RuleRegistry,
}

impl WardenLinter {
    /**
     * Initializes the engine and pre-compiles the Regex library.
     */
    pub fn new() -> Self {
        Self {
            registry: RuleRegistry::build(),
        }
    }

    /**
     * Executes the heuristic sweep against a provided file buffer.
     * Iterates line-by-line to extract precise coordinates for the IDE canvas.
     */
    pub fn analyze_buffer(&self, file_content: &str) -> Vec<LinterIssue> {
        let mut issues = Vec::new();

        for (line_index, line) in file_content.lines().enumerate() {
            let line_number = line_index + 1;

            for rule in &self.registry.rules {
                for capture in rule.pattern.captures_iter(line) {
                    if let Some(matched) = capture.get(0) {
                        let issue = LinterIssue {
                            rule_id: rule.id.to_string(),
                            category: rule.category.clone(),
                            severity: rule.severity.clone(),
                            description: rule.description.to_string(),
                            line_number,
                            column_start: matched.start() + 1, // 1-indexed for Monaco Editor
                            column_end: matched.end() + 1,
                            snippet: matched.as_str().to_string(),
                        };
                        issues.push(issue);
                    }
                }
            }
        }

        issues
    }
}

/**
 * IPC Entry Point for the Tauri Frontend.
 * Accepts a raw string buffer from the editor memory and returns identified anomalies.
 */
#[tauri::command]
pub fn run_linter_sweep(file_content: String) -> Result<Vec<LinterIssue>, String> {
    // Instantiate a localized engine for the IPC request. 
    // In a future performance pass, this could be moved to managed Tauri State to avoid recompiling Regex per-keystroke.
    let linter = WardenLinter::new();
    
    let findings = linter.analyze_buffer(&file_content);
    
    Ok(findings)
}