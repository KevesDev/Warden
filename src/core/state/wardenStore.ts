import { create } from 'zustand';
import { WardenAnalysisResult, LinterCard } from '@core/contracts/WardenSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Global state manager dedicated to the Warden Engine.
 * Decoupled from the editor buffer to prevent background heuristics
 * from causing UI stutters in the main canvas.
 */
interface WardenState {
    // Current heuristic results
    activeAnalysis: WardenAnalysisResult | null;
    isAnalyzing: boolean;
    
    // Actions
    setAnalyzingState: (isAnalyzing: boolean) => void;
    setAnalysisResult: (result: WardenAnalysisResult) => void;
    clearAnalysis: () => void;
    
    // Quick getters
    getCardsForFile: (filePath: string) => LinterCard[];
}

export const useWardenStore = create<WardenState>((set, get) => ({
    activeAnalysis: null,
    isAnalyzing: false,

    setAnalyzingState: (isAnalyzing: boolean) => {
        set({ isAnalyzing });
    },

    setAnalysisResult: (result: WardenAnalysisResult) => {
        SystemLogger.log(
            LogLevel.INFO, 
            'WardenStore', 
            `Analysis completed for ${result.target_file_path}. Found ${result.cards.length} issues in ${result.execution_time_ms}ms.`
        );
        set({ activeAnalysis: result, isAnalyzing: false });
    },

    clearAnalysis: () => {
        SystemLogger.log(LogLevel.INFO, 'WardenStore', 'Cleared active analysis results.');
        set({ activeAnalysis: null, isAnalyzing: false });
    },

    getCardsForFile: (filePath: string) => {
        const { activeAnalysis } = get();
        if (activeAnalysis && activeAnalysis.target_file_path === filePath) {
            return activeAnalysis.cards;
        }
        return [];
    }
}));