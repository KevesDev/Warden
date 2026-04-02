pub mod linter;
pub mod dependency_map;

use serde::{Deserialize, Serialize};
use std::time::Instant;

// Maps to the TypeScript WardenAnalysisResult interface strictly
#[derive(Debug, Serialize, Deserialize)]
pub struct WardenAnalysisResult {
    pub target_file_path: String,
    pub cards: Vec<linter::LinterCard>,
    pub is_clean: bool,
    pub execution_time_ms: u128,
}

/**
 * Primary Tauri command for analyzing a specific chunk of pasted LLM code.
 * Executes purely on Rust background threads, ensuring the UI remains 100% fluid.
 * Uses full_file_buffer for dynamic import context and target_chunk for specific analysis.
 */
#[tauri::command]
pub fn analyze_pasted_chunk(
    file_path: String, 
    full_file_buffer: String, 
    target_chunk: String, 
    line_start: usize
) -> WardenAnalysisResult {
    let start_time = Instant::now();
    let mut total_cards = Vec::new();

    // 1. Run Regex Anti-MVP Pass exclusively on the target chunk
    let mut linter_cards = linter::scan_for_mvp_tactics(&file_path, &target_chunk, line_start);
    total_cards.append(&mut linter_cards);

    // 2. Run Lexical Import/Dependency Pass
    // Passes the full buffer for context building, and target chunk for invocation checking
    let mut ast_cards = dependency_map::scan_for_hallucinations(
        &file_path, 
        &full_file_buffer, 
        &target_chunk, 
        line_start
    );
    total_cards.append(&mut ast_cards);

    let is_clean = total_cards.is_empty();
    let duration = start_time.elapsed();

    // Robust native logging for backend performance tracking
    println!("[INFO] [WardenEngine] Evaluated payload for {} in {}ms", file_path, duration.as_millis());

    WardenAnalysisResult {
        target_file_path: file_path,
        cards: total_cards,
        is_clean,
        execution_time_ms: duration.as_millis(),
    }
}