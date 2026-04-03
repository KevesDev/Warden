#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod file_system;
mod file_ops;
mod warden_engine;
mod pty;

use tauri::api::process::{Command, CommandEvent};

/**
 * Main entry point for the Warden IDE backend.
 * Orchestrates local AI sidecar lifecycle and manages system-level IPC.
 */
fn main() {
    tauri::Builder::default()
        .manage(pty::PtyState::default())
        .setup(|app| {
            // Resolve the physical path of the bundled GGUF model resource
            let resource_path = app.path_resolver()
                .resolve_resource("resources/Phi-4-mini-instruct-Q6_K.gguf")
                .expect("Failed to resolve AI model resource. Verify it is in src-tauri/resources/");

            // sidecar orchestration: Spawns llama-server in a detached background thread.
            // We use the binary name defined in tauri.conf.json externalBin.
            let (mut rx, _child) = Command::new_sidecar("binaries/llama-server")
                .expect("Failed to locate llama-server sidecar binary")
                .args([
                    "--model", resource_path.to_str().unwrap(),
                    "--port", "11434",
                    "--ctx-size", "4096",
                    "--threads", "4",
                    "--parallel", "1"
                ])
                .spawn()
                .expect("Failed to spawn local AI inference sidecar");

            // Capture sidecar logs for the IDE's system terminal
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    if let CommandEvent::Stderr(line) = event {
                        println!("[Warden AI Engine] {}", line);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            file_system::read_directory,
            file_ops::read_file,
            file_ops::write_file,
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            warden_engine::analyze_pasted_chunk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}