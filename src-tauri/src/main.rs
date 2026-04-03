// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file_system;
mod file_ops;
mod warden_engine; 
mod pty; 

fn main() {
    tauri::Builder::default()
        // Initialize the thread-safe global states
        .manage(pty::PtyState::default())
        .manage(warden_engine::WardenEngineState::default())
        .invoke_handler(tauri::generate_handler![
            // File System Context
            file_system::read_directory,
            file_ops::read_file,
            file_ops::write_file,
            // Mount the Warden IPC bridge
            warden_engine::analyze_pasted_chunk,
            warden_engine::index_workspace,
            // Mount the Native Terminal IPC bridge
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}