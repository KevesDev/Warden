import { MockService } from '@services/mock-engine/MockService';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { DiagnosticLogger } from '@core/utils/diagnosticLogger';

/**
 * The central facade for all AI interactions.
 * Decouples the React UI from the underlying generation engines.
 * Acts strictly as a stateless generator, yielding text chunks back to the consumer.
 */
export class LlmOrchestrator {
    // Dynamically checks if Vite is running in development mode.
    private static useMockEngine: boolean = import.meta.env.DEV;

    /**
     * Accepts a user prompt and routes it to the appropriate engine.
     * Yields the asynchronous stream chunks without mutating global UI state.
     */
    public static async *streamResponse(prompt: string): AsyncGenerator<string, void, unknown> {
        SystemLogger.log(LogLevel.INFO, 'LlmOrchestrator', `Routing generation request. Mock Mode: ${this.useMockEngine}`);

        if (this.useMockEngine) {
            DiagnosticLogger.logSessionStart(prompt);
            let fullPayload = "";

            try {
                // Consume the erratic token stream from the headless mock engine
                const stream = MockService.generateStream(prompt);
                for await (const chunk of stream) {
                    fullPayload += chunk;
                    yield chunk; // Yield directly back to the UI layer
                }
            } catch (error) {
                SystemLogger.log(LogLevel.ERROR, 'LlmOrchestrator', 'Mock stream execution failed.', error);
                throw error;
            } finally {
                DiagnosticLogger.logGeneratedCode(fullPayload);
            }
        } else {
            // Production integration point for Claude/GPT API pipelines
            SystemLogger.log(LogLevel.WARN, 'LlmOrchestrator', 'Production LLM integration pending deployment.');
        }
    }

    /**
     * Routes the abort signal to whichever engine is currently active.
     */
    public static abortStream(): void {
        if (this.useMockEngine) {
            MockService.abortStream();
        } else {
            SystemLogger.log(LogLevel.INFO, 'LlmOrchestrator', 'Production HTTP stream aborted.');
        }
    }

    /**
     * Utility to manually override the routing behavior.
     */
    public static forceMockEngine(status: boolean): void {
        this.useMockEngine = status;
        SystemLogger.log(LogLevel.INFO, 'LlmOrchestrator', `Mock Engine override set to: ${status}`);
    }
}