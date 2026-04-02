pub mod operations;

use serde::{Deserialize, Serialize};
use std::path::Path;

// Explicitly matching the IpcBridge.ts ReadFileResponse contract
#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFileResponse {
    pub file_content: String,
}

// Explicitly matching the IpcBridge.ts WriteFileResponse contract
#[derive(Debug, Serialize, Deserialize)]
pub struct WriteFileResponse {
    pub success: bool,
    pub error_message: Option<String>,
}

/**
 * Tauri Command: Reads a file from the host machine.
 * Returns an error string to the frontend if the file does not exist or cannot be read.
 */
#[tauri::command]
pub fn read_file(file_path: String) -> Result<ReadFileResponse, String> {
    let path = Path::new(&file_path);
    
    // Defensive check: Ensure we aren't trying to read a directory as a text file
    if !path.exists() || !path.is_file() {
        return Err(format!("Target is not a valid file: {}", file_path));
    }

    match operations::read_text_file(path) {
        Ok(content) => Ok(ReadFileResponse { file_content: content }),
        Err(error) => Err(format!("Failed to read file contents: {}", error)),
    }
}

/**
 * Tauri Command: Writes string content to a file on the host machine.
 * Instead of throwing a hard error to the frontend bridge, it returns a structured response
 * allowing the React UI to gracefully display the error message.
 */
#[tauri::command]
pub fn write_file(file_path: String, file_content: String) -> Result<WriteFileResponse, String> {
    let path = Path::new(&file_path);

    match operations::write_text_file(path, &file_content) {
        Ok(_) => Ok(WriteFileResponse { 
            success: true, 
            error_message: None 
        }),
        Err(error) => Ok(WriteFileResponse { 
            success: false, 
            error_message: Some(error.to_string()) 
        }),
    }
}