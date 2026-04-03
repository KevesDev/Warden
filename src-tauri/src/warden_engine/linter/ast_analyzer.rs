use tree_sitter::{Parser, Query, QueryCursor};
use super::LinterCard;
use super::rules::ErrorLevel;

/**
 * Structural analyzer using Tree-sitter.
 * Focuses on patterns that compilers allow but architectural rules advise against.
 */
pub struct AstAnalyzer {}

impl AstAnalyzer {
    pub fn new() -> Self {
        Self {}
    }

    pub fn detect_anti_patterns(
        &self,
        file_extension: &str,
        full_file_content: &str,
        start_line: usize,
        end_line: usize,
    ) -> Vec<LinterCard> {
        let mut cards = Vec::new();
        let mut parser = Parser::new();

        // Load language and build appropriate structural queries
        let (language, query_str) = match file_extension {
            "ts" | "tsx" => (
                tree_sitter_typescript::language_typescript(),
                r#"
                (ERROR) @error
                (catch_clause (block) @empty_catch (#match? @empty_catch "^\\{\\s*\\}$"))
                (import_statement) @import
                (call_expression function: (identifier) @func (#match? @func "^(fetch|axios)$"))
                "#
            ),
            _ => return cards, 
        };

        parser.set_language(language).expect("Error loading grammar");
        let tree = parser.parse(full_file_content, None).expect("AST parsing failed");

        let query = Query::new(language, query_str).expect("Failed to compile AST query");
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(&query, tree.root_node(), full_file_content.as_bytes());

        let mut ui_imports_detected = false;
        let mut potential_domain_leaks = Vec::new();

        for m in matches {
            for capture in m.captures {
                let node = capture.node;
                let node_line = node.start_position().row + 1;
                let capture_idx = capture.index;

                // Check imports globally to establish file domain
                if capture_idx == 2 {
                    if let Ok(text) = node.utf8_text(full_file_content.as_bytes()) {
                        if text.contains("react") || text.contains("@components") {
                            ui_imports_detected = true;
                        }
                    }
                }

                if node_line < start_line || node_line > end_line {
                    continue;
                }

                match capture_idx {
                    0 => cards.push(LinterCard {
                        id: format!("WDN-FRAG-{}", node_line),
                        level: ErrorLevel::Warning,
                        line_start: node_line,
                        line_end: node_line,
                        message: "[Incomplete Logic] This syntax appears truncated or broken.".to_string(),
                        rule_triggered: "WDN-AST-FRAG".to_string(),
                        suggested_fix: Some("Check if the AI generation was interrupted."),
                    }),
                    1 => cards.push(LinterCard {
                        id: format!("WDN-CATCH-{}", node_line),
                        level: ErrorLevel::Warning,
                        line_start: node_line,
                        line_end: node_line,
                        message: "[Error Handling] It appears this catch block is empty and may swallow exceptions.".to_string(),
                        rule_triggered: "WDN-AST-CATCH",
                        suggested_fix: Some("Consider adding logging or error handling."),
                    }),
                    3 => potential_domain_leaks.push(node_line),
                    _ => {}
                }
            }
        }

        // Domain Bleed: Logic mixed in UI files
        if ui_imports_detected {
            for line in potential_domain_leaks {
                cards.push(LinterCard {
                    id: format!("WDN-ARCH-{}", line),
                    level: ErrorLevel::Info,
                    line_start: line,
                    line_end: line,
                    message: "[Architecture] Data fetching logic detected in what seems to be a UI component.".to_string(),
                    rule_triggered: "WDN-ARCH-BLEED",
                    suggested_fix: Some("Consider extracting this into a separate Service for cleaner decoupling."),
                });
            }
        }

        cards
    }
}