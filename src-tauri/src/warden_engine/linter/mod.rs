pub mod rules;
pub mod ast_analyzer; 
pub mod entropy_scanner; 

use rules::{ErrorLevel, RuleRegistry};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::warden_engine::dependency_map::DependencyMap;
use ast_analyzer::AstAnalyzer;
use entropy_scanner::EntropyScanner;

/**
 * Universal payload mapped strictly to the frontend WardenSchema.ts
 */
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinterCard {
    pub id: String,
    pub level: ErrorLevel,
    pub line_start: usize,
    pub line_end: usize,
    pub message: String,
    pub rule_triggered: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggested_fix: Option<String>,
}

/**
 * The execution engine for Warden's heuristic analysis.
 * Operates independently of the UI, orchestrating the AAA Tri-Layer engine:
 * AST (Structural), Regex (Semantic), and Entropy (Algorithmic Security).
 */
pub struct WardenLinter {
    registry: RuleRegistry,
    ast_engine: AstAnalyzer,
    entropy_engine: EntropyScanner,
}

impl WardenLinter {
    pub fn new() -> Self {
        Self {
            registry: RuleRegistry::build(),
            ast_engine: AstAnalyzer::new(),
            entropy_engine: EntropyScanner::new(),
        }
    }

    /**
     * Executes the comprehensive sweep against a targeted chunk of code.
     */
    pub fn analyze_payload(
        &self, 
        file_extension: &str,
        full_file_content: &str,
        target_chunk: &str, 
        start_line: usize, 
        end_line: usize,
        dependency_map: &Arc<DependencyMap>
    ) -> Vec<LinterCard> {
        let mut cards = Vec::new();

        // Layer 1: Structural AST Sweep (Hallucination Detection)
        let mut ast_cards = self.ast_engine.detect_hallucinations(
            file_extension,
            full_file_content,
            start_line,
            end_line,
            dependency_map
        );
        cards.append(&mut ast_cards);

        // Layer 2: Algorithmic Security Sweep (Shannon Entropy)
        let mut entropy_cards = self.entropy_engine.scan_payload(target_chunk, start_line);
        cards.append(&mut entropy_cards);

        // Layer 3: Semantic Sweep (Regex - Chat Leaks, Lazy Delegation)
        for (chunk_line_index, line) in target_chunk.lines().enumerate() {
            let current_line = start_line + chunk_line_index;

            for rule in &self.registry.rules {
                for capture in rule.pattern.captures_iter(line) {
                    if let Some(_matched) = capture.get(0) {
                        cards.push(LinterCard {
                            id: format!("{}-{}", rule.rule_id, current_line),
                            level: rule.level.clone(),
                            line_start: current_line,
                            line_end: current_line,
                            message: rule.message.to_string(),
                            rule_triggered: rule.rule_id.to_string(),
                            suggested_fix: rule.suggested_fix.map(|s| s.to_string()),
                        });
                    }
                }
            }
        }

        return cards;
    }
}