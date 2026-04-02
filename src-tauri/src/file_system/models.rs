use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileNode>>,
    pub extension: Option<String>,
    pub size_bytes: Option<u64>,
    pub last_modified_timestamp: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadDirectoryResponse {
    pub root_node: FileNode,
}