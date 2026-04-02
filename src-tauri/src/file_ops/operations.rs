use std::fs;
use std::path::Path;

/**
 * Reads the entire contents of a file into a single String.
 * Utilizes Rust's native fs::read_to_string for highly optimized, buffered reading.
 */
pub fn read_text_file(path: &Path) -> std::io::Result<String> {
    fs::read_to_string(path)
}

/**
 * Writes a string slice to a file, overwriting the file if it exists, 
 * or creating it if it does not.
 */
pub fn write_text_file(path: &Path, content: &str) -> std::io::Result<()> {
    fs::write(path, content)
}