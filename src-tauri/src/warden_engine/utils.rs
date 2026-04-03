use tree_sitter::{Language, Parser};

/**
 * Centralized utility to instantiate a Tree-sitter parser based on file extension.
 * Ensures consistent grammar loading across the AST Linter and Dependency Map without duplication.
 */
pub fn get_parser_and_language(extension: &str) -> Result<(Parser, Language), String> {
    // Route the language grammar based on file extension.
    let language = match extension {
        "ts" | "tsx" => tree_sitter_typescript::language_typescript(),
        "js" | "jsx" => tree_sitter_typescript::language_tsx(),
        "cpp" | "c" | "cc" | "h" | "hpp" => tree_sitter_cpp::language(),
        _ => return Err(format!("Unsupported file extension for AST parsing: {}", extension)),
    };

    let mut parser = Parser::new();
    
    // Robust Error Handling: Ensure the grammar binds successfully before returning.
    if let Err(e) = parser.set_language(language) {
        return Err(format!("Failed to initialize Tree-sitter grammar: {}", e));
    }

    Ok((parser, language))
}