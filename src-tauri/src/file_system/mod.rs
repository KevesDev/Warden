pub mod models;
pub mod reader;

use models::ReadDirectoryResponse;
use reader::build_shallow_node;
use std::path::Path;

#[tauri::command]
pub fn read_directory(directory_path: String) -> Result<ReadDirectoryResponse, String> {
    let path = Path::new(&directory_path);
    
    if !path.exists() || !path.is_dir() {
        return Err(format!("Invalid directory path: {}", directory_path));
    }

    let root_node = build_shallow_node(path).map_err(|e| e.to_string())?;

    Ok(ReadDirectoryResponse { root_node })
}