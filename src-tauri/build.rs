/**
 * This build script is mandatory for Tauri.
 * It is executed before the main Rust compilation step to ensure 
 * the frontend assets and tauri.conf.json are properly bundled into the context.
 */
fn main() {
    tauri_build::build()
}