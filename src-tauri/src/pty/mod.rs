use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::sync::{Arc, Mutex};
use std::io::{Read, Write};
use std::path::{PathBuf};
use tauri::{Window, State};
use serde::Serialize;

/**
 * Data structure for terminal output. 
 * Includes session_id to allow the frontend to filter out stale data.
 */
#[derive(Clone, Serialize)]
pub struct PtyOutput {
    pub session_id: u32,
    pub payload: String,
}

/**
 * Thread-safe global state for managing the PTY backend.
 * current_session_id is incremented on every spawn to invalidate previous threads.
 */
pub struct PtyState {
    pub pty_master: Arc<Mutex<Option<Box<dyn portable_pty::MasterPty + Send>>>>,
    pub writer: Arc<Mutex<Option<Box<dyn std::io::Write + Send>>>>,
    pub current_session_id: Arc<Mutex<u32>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            pty_master: Arc::new(Mutex::new(None)),
            writer: Arc::new(Mutex::new(None)),
            current_session_id: Arc::new(Mutex::new(0)),
        }
    }
}

/**
 * Spawns a native shell process.
 * workspace_path is used to set the initial working directory of the shell.
 */
#[tauri::command]
pub fn spawn_pty(
    window: Window, 
    state: State<'_, PtyState>, 
    workspace_path: Option<String>
) -> Result<u32, String> {
    
    // Increment session ID and purge existing handles to kill the previous shell.
    let new_session_id = {
        let mut id_lock = state.current_session_id.lock().unwrap();
        *id_lock += 1;
        
        let mut master_lock = state.pty_master.lock().unwrap();
        let mut writer_lock = state.writer.lock().unwrap();
        
        // Dropping these handles signals the OS to terminate the child process.
        *master_lock = None;
        *writer_lock = None;
        
        *id_lock
    };

    let pty_system = NativePtySystem::default();
    let pair = pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Determine native shell path.
    let shell = if cfg!(target_os = "windows") {
        "powershell.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string())
    };

    let mut cmd = CommandBuilder::new(shell);
    
    // Configure the Current Working Directory (CWD).
    if let Some(raw_path) = workspace_path {
        if !raw_path.is_empty() {
            let path = PathBuf::from(&raw_path);
            if path.exists() && path.is_dir() {
                // Canonicalize to resolve relative paths and UNC prefixes.
                if let Ok(canonical) = path.canonicalize() {
                    let clean_path = canonical.to_string_lossy()
                        .trim_start_matches(r"\\?\").to_string();
                    cmd.cwd(clean_path);
                } else {
                    cmd.cwd(path);
                }
            }
        }
    }
    
    let _child = pair.slave.spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let master = pair.master;
    let writer = master.take_writer()
        .map_err(|e| format!("Failed to take PTY writer: {}", e))?;
    let mut reader = master.try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

    {
        *state.pty_master.lock().unwrap() = Some(master);
        *state.writer.lock().unwrap() = Some(writer);
    }

    // Dedicated reader thread with session awareness.
    let session_state = Arc::clone(&state.current_session_id);
    std::thread::spawn(move || {
        let mut buf = [0u8; 1024];
        loop {
            // Self-terminate if a newer session has been initialized.
            if *session_state.lock().unwrap() != new_session_id {
                break;
            }

            match reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let output = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let payload = PtyOutput { session_id: new_session_id, payload: output };
                    if window.emit("pty-output", payload).is_err() {
                        break; 
                    }
                }
                Ok(_) | Err(_) => break,
            }
        }
    });

    Ok(new_session_id)
}

/**
 * Forwards user input to the active PTY session.
 */
#[tauri::command]
pub fn write_pty(data: String, state: State<'_, PtyState>) -> Result<(), String> {
    if let Some(writer) = state.writer.lock().unwrap().as_mut() {
        writer.write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;
        writer.flush().map_err(|e| format!("Failed to flush PTY: {}", e))?;
    }
    Ok(())
}

/**
 * Resizes the PTY buffer to match the frontend UI.
 */
#[tauri::command]
pub fn resize_pty(rows: u16, cols: u16, state: State<'_, PtyState>) -> Result<(), String> {
    if let Some(master) = state.pty_master.lock().unwrap().as_ref() {
        master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("Failed to resize PTY: {}", e))?;
    }
    Ok(())
}