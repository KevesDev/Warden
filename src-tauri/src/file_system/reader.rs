use std::fs;
use std::path::Path;
use super::models::FileNode;

pub fn build_shallow_node(path: &Path) -> std::io::Result<FileNode> {
    let metadata = fs::metadata(path)?;
    let is_directory = metadata.is_dir();
    let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let path_str = path.to_string_lossy().to_string();
    
    let mut extension = None;
    if !is_directory {
        if let Some(ext) = path.extension() {
            extension = Some(ext.to_string_lossy().to_string());
        }
    }

    let size_bytes = Some(metadata.len());
    let last_modified_timestamp = metadata.modified().ok().and_then(|t| {
        t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs())
    });

    let mut children = None;
    if is_directory {
        let mut dir_children = Vec::new();
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let child_path = entry.path();
            let child_metadata = entry.metadata()?;
            let child_is_dir = child_metadata.is_dir();
            
            let mut child_ext = None;
            if !child_is_dir {
                if let Some(ext) = child_path.extension() {
                    child_ext = Some(ext.to_string_lossy().to_string());
                }
            }

            dir_children.push(FileNode {
                name: child_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                path: child_path.to_string_lossy().to_string(),
                is_directory: child_is_dir,
                children: None, // SCALABILITY: Shallow read only
                extension: child_ext,
                size_bytes: Some(child_metadata.len()),
                last_modified_timestamp: child_metadata.modified().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs())
                }),
            });
        }
        
        dir_children.sort_by(|a, b| {
            b.is_directory.cmp(&a.is_directory).then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        children = Some(dir_children);
    }

    Ok(FileNode {
        name,
        path: path_str,
        is_directory,
        children,
        extension,
        size_bytes,
        last_modified_timestamp,
    })
}