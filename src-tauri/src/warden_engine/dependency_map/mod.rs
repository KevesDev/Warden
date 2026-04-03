use dashmap::DashMap;
use ignore::WalkBuilder;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tree_sitter::{Query, QueryCursor};
use crate::warden_engine::utils::get_parser_and_language;

/**
 * Represents the structural location of a defined symbol within the workspace.
 * Note: Fields are retained and silenced for upcoming LSP 'Go To Definition' provider support.
 */
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct SymbolLocation {
    pub file_path: PathBuf,
    pub line_number: usize,
    pub is_header: bool,
}

/**
 * Concurrent, AST-driven cache of all declarations within the active workspace.
 * Utilizes shallow parsing to maintain real-time indexing without blocking the primary execution thread.
 */
pub struct DependencyMap {
    // DashMap provides granular locking for high-concurrency read/write operations.
    // Key: Symbol Name (e.g., "DatabaseConnector"), Value: Location Metadata.
    cache: Arc<DashMap<String, SymbolLocation>>,
}

impl DependencyMap {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(DashMap::new()),
        }
    }

    /**
     * Clears the current cache and initiates a shallow AST sweep of the provided directory.
     * Incorporates a strict, IDE-level exclusion list to prevent parsing massive dependency folders.
     */
    pub fn index_workspace(&self, root_path: &Path) {
        self.cache.clear();
        println!("[INFO] [DependencyMap] Initiating workspace index at: {:?}", root_path);

        // We use WalkBuilder to traverse the directory.
        // We enforce an explicit IDE-level exclusion list via filter_entry.
        // This guarantees we never parse 'node_modules' or 'target' directories, even if the 
        // user's target project lacks a .gitignore file.
        let walker = WalkBuilder::new(root_path)
            .hidden(true) // Ignores dotfiles like .git
            .git_ignore(true) // Still respects project-level gitignores if they exist
            .filter_entry(|entry| {
                let file_name = entry.file_name().to_string_lossy();
                !matches!(
                    file_name.as_ref(),
                    "node_modules" | "target" | "build" | "dist" | "out" | "bin" | "obj" | "vendor" | ".idea" | ".vscode"
                )
            })
            .build();

        let mut file_count = 0;

        for result in walker.flatten() {
            let path = result.path();
            if path.is_file() {
                if self.index_file(path) {
                    file_count += 1;
                }
            }
        }

        println!("[INFO] [DependencyMap] Indexing complete. Mapped {} files. Total Symbols: {}", file_count, self.cache.len());
    }

    /**
     * Determines if an AI-generated symbol exists within the validated project architecture.
     */
    pub fn symbol_exists(&self, symbol_name: &str) -> bool {
        self.cache.contains_key(symbol_name)
    }

    /**
     * Executes a shallow structural query against a single file to extract definitions.
     * Returns true if the file was successfully parsed and supported.
     */
    fn index_file(&self, file_path: &Path) -> bool {
        let extension = match file_path.extension().and_then(|s| s.to_str()) {
            Some(ext) => ext,
            None => return false,
        };
        
        let is_header = extension == "h" || extension == "hpp";

        // Utilize the centralized grammar loader
        let (mut parser, language) = match get_parser_and_language(extension) {
            Ok(components) => components,
            Err(_) => return false, // Silently bypass unsupported file types
        };

        let source_code = match std::fs::read_to_string(file_path) {
            Ok(code) => code,
            Err(e) => {
                println!("[WARN] [DependencyMap] Failed to read file {:?}: {}", file_path, e);
                return false;
            }
        };

        let tree = match parser.parse(&source_code, None) {
            Some(t) => t,
            None => {
                println!("[WARN] [DependencyMap] Tree-sitter failed to parse {:?}", file_path);
                return false;
            }
        };

        // Define S-expressions to extract structural intent dynamically based on the language
        let query_str = if extension == "ts" || extension == "tsx" || extension == "js" {
            r#"
                (class_declaration name: (type_identifier) @decl.class)
                (interface_declaration name: (type_identifier) @decl.interface)
                (function_declaration name: (identifier) @decl.func)
            "#
        } else {
            // C/C++ S-expressions
            r#"
                (class_specifier name: (type_identifier) @decl.class)
                (struct_specifier name: (type_identifier) @decl.struct)
                (function_definition declarator: (function_declarator declarator: (identifier) @decl.func))
                (declaration declarator: (function_declarator declarator: (identifier) @decl.header_func))
            "#
        };

        let query = match Query::new(language, query_str) {
            Ok(q) => q,
            Err(e) => {
                println!("[ERROR] [DependencyMap] Query compilation failed for {}: {}", extension, e);
                return false;
            }
        };

        let mut cursor = QueryCursor::new();
        let source_bytes = source_code.as_bytes();

        let matches = cursor.matches(&query, tree.root_node(), source_bytes);

        for m in matches {
            for capture in m.captures {
                if let Ok(symbol_name) = std::str::from_utf8(&source_bytes[capture.node.byte_range()]) {
                    let location = SymbolLocation {
                        file_path: file_path.to_path_buf(),
                        line_number: capture.node.start_position().row + 1,
                        is_header,
                    };
                    
                    self.cache.insert(symbol_name.to_string(), location);
                }
            }
        }

        true
    }
}