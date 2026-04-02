import { invoke } from '@tauri-apps/api/tauri';
import { WardenAnalysisResult } from '@core/contracts/WardenSchema';
import { useWardenStore } from '@core/state/wardenStore';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Service for interfacing with the Rust-based Warden Heuristic Engine.
 * Offloads heavy AST and Regex parsing to native OS threads.
 */
export class WardenIPC {
    /**
     * Dispatches a code block to Rust for Linter and Dependency analysis.
     * Automatically updates the global Warden Store upon completion.
     * * @param filePath The absolute path of the active file.
     * @param fullFileBuffer The entire file content currently in memory (for import context).
     * @param targetChunk The specific text block to analyze (pasted code or LLM stream).
     * @param lineStart The absolute line number where the chunk begins.
     */
    public static async analyzeSelection(
        filePath: string,
        fullFileBuffer: string,
        targetChunk: string,
        lineStart: number
    ): Promise<void> {
        const wardenStore = useWardenStore.getState();
        wardenStore.setAnalyzingState(true);

        SystemLogger.log(LogLevel.INFO, 'WardenIPC', `Dispatching chunk for analysis: ${filePath}:${lineStart}`);

        try {
            // Note: Command string must match the #[tauri::command] in main.rs exactly
            const result = await invoke<WardenAnalysisResult>('analyze_pasted_chunk', {
                filePath,
                fullFileBuffer,
                targetChunk,
                lineStart
            });

            // Automatically hydrate the store with the analysis results
            wardenStore.setAnalysisResult(result);
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'WardenIPC', 'Failed to execute heuristic analysis.', error);
            wardenStore.setAnalyzingState(false);
        }
    }
}