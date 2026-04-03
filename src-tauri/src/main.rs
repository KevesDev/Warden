// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod file_system;
mod file_ops;
mod warden_engine; // Register the proprietary Heuristic Engine
mod pty; // SPRINT 6: Register the native terminal backend

fn main() {
    tauri::Builder::default()
        // Initialize the thread-safe global state for the native shell
        .manage(pty::PtyState::default())
        .invoke_handler(tauri::generate_handler![
            file_system::read_directory,
            file_ops::read_file,
            file_ops::write_file,
            // Mount the Warden IPC bridge
            warden_engine::analyze_pasted_chunk,
            // Mount the Native Terminal IPC bridge
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}