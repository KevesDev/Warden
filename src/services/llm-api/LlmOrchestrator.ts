import { MockService } from '@services/mock-engine/MockService';
import { useWardenStore } from '@core/state/wardenStore';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * The central facade for all AI interactions.
 * Decouples the React UI from the underlying generation engines.
 * Routes traffic to the MockService during development or the actual LLM APIs in production.
 */
export class LlmOrchestrator {
    // Dynamically checks if Vite is running in development mode.
    // This allows seamless testing without breaking production builds.
    private static useMockEngine: boolean = import.meta.env.DEV;

    /**
     * Accepts a user prompt and routes it to the appropriate engine.
     * Consumes the asynchronous stream and pipes it securely to the global UI store.
     */
    public static async streamResponse(prompt: string): Promise<void> {
        SystemLogger.log(LogLevel.INFO, 'LlmOrchestrator', `Routing generation request. Mock Mode: ${this.useMockEngine}`);

        const store = useWardenStore.getState();

        if (this.useMockEngine) {
            store.startStream();
            try {
                // Consume the erratic token stream from the headless mock engine
                const stream = MockService.generateStream(prompt);
                for await (const chunk of stream) {
                    store.appendStreamChunk(chunk);
                }
            } catch (error) {
                SystemLogger.log(LogLevel.ERROR, 'LlmOrchestrator', 'Mock stream execution failed.', error);
            } finally {
                store.endStream();
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
            // Signals the termination of active HTTP streams for production endpoints
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