pub mod linter;
pub mod dependency_map;
pub mod utils; 

use serde::{Deserialize, Serialize};
use std::time::Instant;
use std::sync::Arc;
use std::path::{Path, PathBuf};
use tauri::State;

pub struct WardenEngineState {
    pub linter_engine: linter::WardenLinter,
    pub dependency_map: Arc<dependency_map::DependencyMap>,
}

impl Default for WardenEngineState {
    fn default() -> Self {
        let dep_map = Arc::new(dependency_map::DependencyMap::new());
        Self {
            linter_engine: linter::WardenLinter::new(),
            dependency_map: dep_map,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WardenAnalysisResult {
    pub target_file_path: String,
    pub cards: Vec<linter::LinterCard>,
    pub is_clean: bool,
    pub execution_time_ms: u128,
}

#[tauri::command]
pub async fn index_workspace(
    workspace_path: String,
    state: State<'_, WardenEngineState>,
) -> Result<(), String> {
    let path = PathBuf::from(workspace_path);
    if path.exists() && path.is_dir() {
        let map_clone = Arc::clone(&state.dependency_map);
        
        tauri::async_runtime::spawn_blocking(move || {
            map_clone.index_workspace(&path);
        });
        Ok(())
    } else {
        Err(format!("Invalid workspace path provided for indexing: {:?}", path))
    }
}

#[tauri::command]
pub fn analyze_pasted_chunk(
    file_path: String, 
    full_file_buffer: String, 
    target_chunk: String, 
    line_start: usize,
    state: State<'_, WardenEngineState>, 
) -> WardenAnalysisResult {
    let start_time = Instant::now();
    
    let line_end = line_start + target_chunk.lines().count().saturating_sub(1);

    let extension = Path::new(&file_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    let total_cards = state.linter_engine.analyze_payload(
        extension,
        &full_file_buffer,
        &target_chunk, 
        line_start, 
        line_end,
        &state.dependency_map
    );

    let is_clean = total_cards.is_empty();
    let duration = start_time.elapsed();

    println!(
        "[INFO] [WardenEngine] Evaluated payload for {} (Lines {}-{}) in {}ms. Clean: {}", 
        file_path, line_start, line_end, duration.as_millis(), is_clean
    );

    WardenAnalysisResult {
        target_file_path: file_path,
        cards: total_cards,
        is_clean,
        execution_time_ms: duration.as_millis(),
    }
}