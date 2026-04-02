// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file_system;
mod file_ops; // Registering the new file operations module

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            file_system::read_directory,
            file_ops::read_file,
            file_ops::write_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}