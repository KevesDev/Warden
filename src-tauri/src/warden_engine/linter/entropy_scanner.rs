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
            // Isolates text enclosed in single quotes, double quotes, or backticks
            string_extractor: Regex::new(r#"(['"`])(.*?)\1"#).expect("Failed to compile string extraction regex"),
        }
    }

    /**
     * Calculates the Shannon entropy of a given string.
     * Higher values indicate higher randomness (cryptographic tokens usually exceed 4.5).
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
                // capture.get(2) contains the actual text inside the quotes
                if let Some(matched_string) = capture.get(2) {
                    let text = matched_string.as_str();
                    
                    // Filter: We only care about strings long enough to be an actual token/key.
                    // A 4-character string might have high entropy but isn't a security risk.
                    if text.len() >= 16 {
                        let entropy = Self::calculate_entropy(text);
                        
                        // Industry standard threshold for Base64/Hex cryptographic secrets is ~4.5
                        if entropy > 4.5 {
                            cards.push(LinterCard {
                                id: format!("WDN-ENTROPY-{}-{}", current_line, matched_string.start()),
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