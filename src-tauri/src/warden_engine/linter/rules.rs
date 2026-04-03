use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/**
 * Enforcement level mapped strictly to the frontend ErrorLevel enum.
 */
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ErrorLevel {
    #[serde(rename = "INFO")]
    Info,
    #[serde(rename = "WARNING")]
    Warning,
    #[serde(rename = "CRITICAL")]
    Critical,
}

/**
 * Represents a single heuristic rule for the Warden Engine.
 */
pub struct LinterRule {
    pub rule_id: &'static str,
    pub level: ErrorLevel,
    pub message: &'static str,
    pub pattern: Regex,
    pub suggested_fix: Option<&'static str>,
}

/**
 * The Rule Registry initializes and compiles the Regex patterns.
 */
pub struct RuleRegistry {
    pub rules: Vec<Arc<LinterRule>>,
}

impl RuleRegistry {
    /**
     * Instantiates the library of AI-detection heuristics.
     */
    pub fn build() -> Self {
        let mut rules = Vec::new();

        rules.push(Arc::new(LinterRule {
            rule_id: "WDN-LAZY-001",
            level: ErrorLevel::Critical,
            message: "AI produced placeholder comments instead of functional code.",
            pattern: Regex::new(r"(?i)(//|#|/\*)\s*(todo|fixme|implement later|insert logic here|replace with actual)").expect("Invalid Regex Compilation: WDN-LAZY-001"),
            suggested_fix: Some("Request the AI to write the complete implementation rather than leaving placeholders."),
        }));

        rules.push(Arc::new(LinterRule {
            rule_id: "WDN-LAZY-002",
            level: ErrorLevel::Critical,
            message: "AI utilized ellipses or 'pass' to skip logic blocks.",
            // Tuned: Catches `...` sitting alone on a line (ignoring indentation) to prevent flagging spread operators.
            pattern: Regex::new(r"(?m)^\s*(\.{3}|…)\s*$").expect("Invalid Regex Compilation: WDN-LAZY-002"),
            suggested_fix: Some("Do not accept incomplete code logic. Prompt the AI to expand the skipped block."),
        }));

        rules.push(Arc::new(LinterRule {
            rule_id: "WDN-CHAT-001",
            level: ErrorLevel::Warning,
            message: "Codebase contains conversational AI commentary.",
            pattern: Regex::new(r"(?i)(//|#|/\*)\s*(here is the|as an ai|i cannot|please note that|certainly!|sure, I can)").expect("Invalid Regex Compilation: WDN-CHAT-001"),
            suggested_fix: Some("Remove conversational text from the code buffer."),
        }));

        Self { rules }
    }
}