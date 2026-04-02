import { create } from 'zustand';
import { WardenAnalysisResult, LinterCard } from '@core/contracts/WardenSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Global state manager dedicated to the Warden Engine.
 * Manages both the analysis results and the active AI streaming buffer.
 */
interface WardenState {
    // Analysis results
    activeAnalysis: WardenAnalysisResult | null;
    isAnalyzing: boolean;
    
    // AI Streaming State (Sprint 4 Phase 3)
    isStreaming: boolean;
    streamingBuffer: string; // The "accumulated" text from the current stream
    latestChunk: string | null; // The most recent token received
    
    // Actions
    setAnalyzingState: (isAnalyzing: boolean) => void;
    setAnalysisResult: (result: WardenAnalysisResult) => void;
    clearAnalysis: () => void;
    
    // Streaming Actions
    startStream: () => void;
    appendStreamChunk: (chunk: string) => void;
    endStream: () => void;
    
    // Quick getters
    getCardsForFile: (filePath: string) => LinterCard[];
}

export const useWardenStore = create<WardenState>((set, get) => ({
    activeAnalysis: null,
    isAnalyzing: false,
    isStreaming: false,
    streamingBuffer: '',
    latestChunk: null,

    setAnalyzingState: (isAnalyzing: boolean) => {
        set({ isAnalyzing });
    },

    setAnalysisResult: (result: WardenAnalysisResult) => {
        SystemLogger.log(
            LogLevel.INFO, 
            'WardenStore', 
            `Analysis completed for ${result.target_file_path}. Found ${result.cards.length} issues.`
        );
        set({ activeAnalysis: result, isAnalyzing: false });
    },

    clearAnalysis: () => {
        set({ activeAnalysis: null, isAnalyzing: false });
    },

    startStream: () => {
        SystemLogger.log(LogLevel.INFO, 'WardenStore', 'AI Streaming started.');
        set({ isStreaming: true, streamingBuffer: '', latestChunk: null });
    },

    appendStreamChunk: (chunk: string) => {
        set((state) => ({
            streamingBuffer: state.streamingBuffer + chunk,
            latestChunk: chunk
        }));
    },

    endStream: () => {
        SystemLogger.log(LogLevel.INFO, 'WardenStore', 'AI Streaming completed.');
        set({ isStreaming: false, latestChunk: null });
    },

    getCardsForFile: (filePath: string) => {
        const { activeAnalysis } = get();
        if (activeAnalysis && activeAnalysis.target_file_path === filePath) {
            return activeAnalysis.cards;
        }
        return [];
    }
}));