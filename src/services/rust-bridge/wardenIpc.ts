import { invoke } from '@tauri-apps/api/tauri';
import { WardenAnalysisResult } from '@core/contracts/WardenSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Service for interfacing with the Rust-based Warden Heuristic Engine.
 * Acts as a strictly decoupled, stateless transport layer.
 */
export class WardenIPC {
    /**
     * Dispatches a code block to Rust for Linter and Dependency analysis.
     * @param filePath The absolute path of the active file.
     * @param fullFileBuffer The entire file content currently in memory.
     * @param targetChunk The specific text block to analyze.
     * @param lineStart The absolute line number where the chunk begins.
     * @returns A Promise resolving to the structural analysis data.
     */
    public static async analyzeSelection(
        filePath: string,
        fullFileBuffer: string,
        targetChunk: string,
        lineStart: number
    ): Promise<WardenAnalysisResult> {
        SystemLogger.log(LogLevel.INFO, 'WardenIPC', `Dispatching chunk for analysis: ${filePath}:${lineStart}`);

        try {
            const result = await invoke<WardenAnalysisResult>('analyze_pasted_chunk', {
                filePath,
                fullFileBuffer,
                targetChunk,
                lineStart
            });
            return result;
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'WardenIPC', 'Failed to execute heuristic analysis.', error);
            throw error;
        }
    }
}