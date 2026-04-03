use regex::Regex;
use std::collections::HashMap;
use super::LinterCard;
use super::rules::ErrorLevel;

/**
 * Algorithmic secret detection utilizing Shannon Entropy.
 * Evaluates the randomness of string literals to identify hardcoded API keys, 
 * cryptographic tokens, and passwords without relying on specific variable naming conventions.
 */
pub struct EntropyScanner {
    string_extractor: Regex,
}

impl EntropyScanner {
    pub fn new() -> Self {
        Self {
            // Explicit automaton pattern to prevent ReDoS backtracking attacks
            string_extractor: Regex::new(
                r#""([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`"#
            ).expect("Failed to compile string extraction regex"),
        }
    }

    /**
     * Calculates the Shannon entropy of a given string.
     */
    fn calculate_entropy(data: &str) -> f64 {
        if data.is_empty() {
            return 0.0;
        }

        let mut frequency_map = HashMap::new();
        for c in data.chars() {
            *frequency_map.entry(c).or_insert(0) += 1;
        }

        let length = data.chars().count() as f64;
        let mut entropy = 0.0;

        for count in frequency_map.values() {
            let probability = *count as f64 / length;
            entropy -= probability * probability.log2();
        }

        entropy
    }

    /**
     * Sweeps the AI payload for string literals and flags any that exhibit cryptographic randomness.
     */
    pub fn scan_payload(&self, target_chunk: &str, start_line: usize) -> Vec<LinterCard> {
        let mut cards = Vec::new();

        for (chunk_line_index, line) in target_chunk.lines().enumerate() {
            let current_line = start_line + chunk_line_index;

            for capture in self.string_extractor.captures_iter(line) {
                let matched_string = capture.get(1)
                    .or_else(|| capture.get(2))
                    .or_else(|| capture.get(3));
                
                if let Some(m) = matched_string {
                    let text = m.as_str();
                    
                    // Filter: Must be at least 16 chars AND contain no spaces. 
                    // This prevents standard conversational English strings from triggering false positives.
                    if text.len() >= 16 && !text.contains(' ') {
                        let entropy = Self::calculate_entropy(text);
                        
                        // Tuned Threshold: 3.8 catches AWS Base32 keys and alphanumeric passwords.
                        // Standard Base64/JWTs will easily exceed 4.5.
                        if entropy > 3.8 {
                            cards.push(LinterCard {
                                id: format!("WDN-ENTROPY-{}-{}", current_line, m.start()),
                                level: ErrorLevel::Critical,
                                line_start: current_line,
                                line_end: current_line,
                                message: "High Entropy String Detected: This string exhibits cryptographic randomness and appears to be a hardcoded secret or API key.".to_string(),
                                rule_triggered: "WDN-SEC-002".to_string(),
                                suggested_fix: Some("Extract this secret into a secure environment variable (.env) configuration.".to_string()),
                            });
                        }
                    }
                }
            }
        }

        cards
    }
}