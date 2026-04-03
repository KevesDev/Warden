pub mod linter;
pub mod utils;

use serde::{Deserialize, Serialize};
use serde_json::json;
use linter::{LinterCard, rules::ErrorLevel, rules::RuleRegistry, entropy_scanner::EntropyScanner, ast_analyzer::AstAnalyzer};

#[derive(Serialize, Deserialize)]
pub struct WardenAnalysisResult {
    pub target_file_path: String,
    pub cards: Vec<LinterCard>,
}

/**
 * Orchestrates analysis of a code block by combining static rules and local AI reasoning.
 */
#[tauri::command]
pub async fn analyze_pasted_chunk(
    file_path: String,
    full_file_buffer: String,
    target_chunk: String,
    line_start: usize
) -> Result<WardenAnalysisResult, String> {
    let mut cards = Vec::new();

    // 1. Semantic Rules (Regex)
    let registry = RuleRegistry::build();
    for (line_offset, line_text) in target_chunk.lines().enumerate() {
        let current_line = line_start + line_offset;
        for rule in &registry.rules {
            if rule.pattern.is_match(line_text) {
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

    // 2. Entropy Check (Secrets)
    let entropy_scanner = EntropyScanner::new();
    cards.extend(entropy_scanner.scan_payload(&target_chunk, line_start));

    // 3. Structural Check (AST Fragments & Anti-patterns)
    let extension = file_path.split('.').last().unwrap_or("");
    let line_count = target_chunk.lines().count();
    let line_end = line_start + line_count.saturating_sub(1);
    
    let ast_analyzer = AstAnalyzer::new();
    cards.extend(ast_analyzer.detect_anti_patterns(
        extension,
        &full_file_buffer,
        line_start,
        line_end
    ));

    // 4. Local AI Check (Qualitative Reasoning)
    if let Ok(ai_cards) = request_local_ai_analysis(&target_chunk).await {
        // Clean up redundant warnings: If AI found a specific problem, 
        // we can remove generic AST fragment warnings on that line.
        let ai_lines: std::collections::HashSet<usize> = ai_cards.iter().map(|c| c.line_start).collect();
        cards.retain(|c| !ai_lines.contains(&c.line_start) || c.rule_triggered != "WDN-AST-FRAG");
        
        // Offset AI lines to the absolute file position
        for mut card in ai_cards {
            card.line_start += line_start.saturating_sub(1);
            card.line_end += line_start.saturating_sub(1);
            cards.push(card);
        }
    }

    Ok(WardenAnalysisResult {
        target_file_path: file_path,
        cards,
    })
}

/**
 * Sends a request to the bundled llama-server sidecar.
 * Prompts the AI to act as an advisory architectural guide.
 */
async fn request_local_ai_analysis(code: &str) -> Result<Vec<LinterCard>, String> {
    let client = reqwest::Client::new();
    
    let prompt = format!(
        "<|system|>\nYou are the Warden Architectural Advisory. Your goal is to be 80% correct and 100% helpful. \
        Provide polite suggestions regarding concerns like [Incomplete Logic], [Decoupling], and [Redundancy]. \
        Avoid confident claims; use phrases like 'It appears that' or 'Consider'. \
        Return ONLY a JSON array of objects with keys: level (INFO, WARNING, CRITICAL), line_start, line_end, message, rule_triggered, suggested_fix.\n<|end|>\n\
        <|user|>\nAnalyze this block:\n{}\n<|end|>\n<|assistant|>",
        code
    );

    let response = client.post("http://localhost:11434/completion")
        .json(&json!({
            "prompt": prompt,
            "temperature": 0.2,
            "n_predict": 512,
            "stop": ["<|end|>"]
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json_res: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let content = json_res["content"].as_str().ok_or("Empty AI response")?;
    
    // Attempt to parse the AI's JSON output into cards
    serde_json::from_str::<Vec<LinterCard>>(content).map_err(|_| "Failed to parse AI JSON advice".to_string())
}