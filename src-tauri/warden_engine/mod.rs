pub mod linter;
pub mod dependency_map;

use serde::{Deserialize, Serialize};
use std::time::Instant;

// Mirrors the TypeScript WardenAnalysisResult interface
#[derive(Debug, Serialize, Deserialize)]
pub struct WardenAnalysisResult {
    pub target_file_path: String,
    pub cards: Vec<linter::LinterCard>,
    pub is_clean: bool,
    pub execution_time_ms: u128,
}

/**
 * Primary Tauri command for analyzing a specific chunk of pasted code.
 * Runs on a native OS thread, keeping the React UI 100% fluid.
 */
#[tauri::command]
pub fn analyze_pasted_chunk(file_path: String, pasted_content: String, line_start: usize, _line_end: usize) -> WardenAnalysisResult {
    let start_time = Instant::now();
    let mut total_cards = Vec::new();

    // 1. Run Regex Linter Pass
    let mut linter_cards = linter::scan_for_mvp_tactics(&file_path, &pasted_content, line_start);
    total_cards.append(&mut linter_cards);

    // 2. Run AST Dependency Pass
    let mut ast_cards = dependency_map::scan_for_hallucinations(&file_path, &pasted_content, line_start);
    total_cards.append(&mut ast_cards);

    let is_clean = total_cards.is_empty();
    let duration = start_time.elapsed();

    WardenAnalysisResult {
        target_file_path: file_path,
        cards: total_cards,
        is_clean,
        execution_time_ms: duration.as_millis(),
    }
}