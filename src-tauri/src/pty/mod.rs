use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::sync::{Arc, Mutex};
use std::io::{Read, Write};
use std::path::{PathBuf};
use tauri::{Window, State};
use serde::Serialize;

/**
 * Encapsulates terminal output. 
 * The session_id serves as a handshake, ensuring the frontend only renders 
 * data from the currently active shell process.
 */
#[derive(Clone, Serialize)]
pub struct PtyOutput {
    pub session_id: u64,
    pub payload: String,
}

/**
 * Thread-safe global state for managing the PTY backend.
 * Tracking the current_session_id ensures stale threads self-terminate.
 */
pub struct PtyState {
    pub pty_master: Arc<Mutex<Option<Box<dyn portable_pty::MasterPty + Send>>>>,
    pub writer: Arc<Mutex<Option<Box<dyn std::io::Write + Send>>>>,
    pub current_session_id: Arc<Mutex<u64>>,
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
 * Replaces the existing shell by dropping active handles. Bypasses 
 * path canonicalization to ensure raw directory paths are accepted by native OS shells.
 */
#[tauri::command]
pub fn spawn_pty(
    window: Window, 
    state: State<'_, PtyState>, 
    session_id: u64,
    workspace_path: Option<String>
) -> Result<(), String> {
    
    // Process Enforcement and Cleanup
    {
        let mut master_lock = state.pty_master.lock().unwrap();
        let mut writer_lock = state.writer.lock().unwrap();
        let mut id_lock = state.current_session_id.lock().unwrap();
        
        // Dropping the master and writer signals the OS to terminate the child process
        *master_lock = None;
        *writer_lock = None;
        *id_lock = session_id;
    }

    let pty_system = NativePtySystem::default();
    let pair = pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }).map_err(|e| format!("Failed to open PTY system: {}", e))?;

    let shell = if cfg!(target_os = "windows") {
        "powershell.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string())
    };

    let mut cmd = CommandBuilder::new(shell);
    
    // Directory Context Binding
    // Raw path injection is utilized to prevent UNC prefixes (\\?\) which standard 
    // path canonicalization creates, as these prefixes are rejected by certain shells.
    if let Some(path_str) = workspace_path {
        if !path_str.is_empty() {
            let path = PathBuf::from(&path_str);
            if path.exists() && path.is_dir() {
                cmd.cwd(path);
            }
        }
    }
    
    let _child = pair.slave.spawn_command(cmd)
        .map_err(|e| format!("Native OS Shell Spawn Error: {}", e))?;

    let master = pair.master;
    let writer = master.take_writer()
        .map_err(|e| format!("Failed to connect Writer: {}", e))?;
    let mut reader = master.try_clone_reader()
        .map_err(|e| format!("Failed to connect Reader: {}", e))?;

    {
        *state.pty_master.lock().unwrap() = Some(master);
        *state.writer.lock().unwrap() = Some(writer);
    }

    // Asynchronous Output Streaming
    let session_state = Arc::clone(&state.current_session_id);
    std::thread::spawn(move || {
        let mut buf = [0u8; 1024];
        loop {
            // Guard: Self-terminate if the frontend has generated a newer session
            if *session_state.lock().unwrap() != session_id {
                break;
            }

            match reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    let output = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let payload = PtyOutput { session_id, payload: output };
                    if window.emit("pty-output", payload).is_err() {
                        break; 
                    }
                }
                Ok(_) | Err(_) => break,
            }
        }
    });

    Ok(())
}

/**
 * Forwards user input to the active PTY session.
 */
#[tauri::command]
pub fn write_pty(data: String, state: State<'_, PtyState>) -> Result<(), String> {
    if let Some(writer) = state.writer.lock().unwrap().as_mut() {
        writer.write_all(data.as_bytes())
            .map_err(|e| format!("PTY Write Error: {}", e))?;
        writer.flush().map_err(|e| format!("PTY Flush Error: {}", e))?;
    }
    Ok(())
}

/**
 * Resizes the PTY buffer to match the frontend UI layout geometry.
 */
#[tauri::command]
pub fn resize_pty(rows: u16, cols: u16, state: State<'_, PtyState>) -> Result<(), String> {
    if let Some(master) = state.pty_master.lock().unwrap().as_ref() {
        master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("PTY Resize Error: {}", e))?;
    }
    Ok(())
}