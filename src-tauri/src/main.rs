// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file_system;
mod file_ops;
mod warden_engine; // Registering the proprietary Heuristic Engine

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            file_system::read_directory,
            file_ops::read_file,
            file_ops::write_file,
            warden_engine::analyze_pasted_chunk // Mounting the Warden IPC bridge
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}