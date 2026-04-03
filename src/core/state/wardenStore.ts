import { create } from 'zustand';
import { WardenAnalysisResult, LinterCard } from '@core/contracts/WardenSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Global state manager dedicated to the Warden Engine.
 * Manages both the analysis results and the active AI streaming buffer.
 */
interface WardenState {
    activeAnalysis: WardenAnalysisResult | null;
    isAnalyzing: boolean;
    
    // UI Interaction State
    focusedIssueId: string | null;
    
    isStreaming: boolean;
    streamingBuffer: string; 
    latestChunk: string | null; 
    
    setAnalyzingState: (isAnalyzing: boolean) => void;
    setAnalysisResult: (result: WardenAnalysisResult) => void;
    clearAnalysis: () => void;
    focusIssue: (id: string | null) => void;
    
    startStream: () => void;
    appendStreamChunk: (chunk: string) => void;
    endStream: () => void;
    
    getCardsForFile: (filePath: string) => LinterCard[];
}

export const useWardenStore = create<WardenState>((set, get) => ({
    activeAnalysis: null,
    isAnalyzing: false,
    focusedIssueId: null,
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
        set({ activeAnalysis: result, isAnalyzing: false, focusedIssueId: null });
    },

    clearAnalysis: () => {
        set({ activeAnalysis: null, isAnalyzing: false, focusedIssueId: null });
        SystemLogger.log(LogLevel.INFO, 'WardenStore', 'Analysis state cleared.');
    },

    focusIssue: (id: string | null) => {
        set({ focusedIssueId: id });
    },

    startStream: () => {
        SystemLogger.log(LogLevel.INFO, 'WardenStore', 'AI Streaming started.');
        set({ isStreaming: true, streamingBuffer: '', latestChunk: null, focusedIssueId: null });
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