import { useWardenStore } from '@core/state/wardenStore';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { MockSample, MOCK_SAMPLES } from './mockSamples';

/**
 * Headless service simulating high-velocity LLM code streaming.
 * Consumes externalized "dirty" samples to test the Warden Engine.
 * Implements an interruption mechanism to prevent state corruption on user abort.
 */
export class MockService {
    private static instance: MockService;
    private isBusy: boolean = false;
    private abortController: AbortController | null = null;

    public static getInstance(): MockService {
        if (!MockService.instance) {
            MockService.instance = new MockService();
        }
        return MockService.instance;
    }

    /**
     * Instantly terminates any active code stream.
     * Essential for maintaining state integrity when the user interrupts the AI.
     */
    public abortStream(): void {
        if (this.abortController) {
            this.abortController.abort();
            SystemLogger.log(LogLevel.INFO, 'MockService', 'Active stream aborted by user.');
        }
    }

    /**
     * Starts a simulated stream of code into the global wardenStore.
     * Mimics erratic token delivery (1-5 characters per "tick").
     * @param type The code sample to stream (imported from mockSamples config).
     * @param tokensPerSec Simulated velocity (Stress test target: 2,000 tokens/sec).
     */
    public async streamCode(type: MockSample, tokensPerSec: number = 20): Promise<void> {
        if (this.isBusy) {
            SystemLogger.log(LogLevel.WARN, 'MockService', 'Stream ignored: Engine is already busy.');
            return;
        }

        this.isBusy = true;
        this.abortController = new AbortController();
        const { signal } = this.abortController;

        const store = useWardenStore.getState();
        // Retrieve the payload from the externalized configuration
        const code = MOCK_SAMPLES[type];
        const delay = 1000 / tokensPerSec;

        store.startStream();

        try {
            let cursor = 0;
            while (cursor < code.length) {
                // Instantly break the loop if the stream was aborted
                if (signal.aborted) break;

                // Randomize chunk size for realistic streaming behavior
                const chunkSize = Math.floor(Math.random() * 5) + 1;
                const chunk = code.substring(cursor, cursor + chunkSize);
                
                store.appendStreamChunk(chunk);
                cursor += chunkSize;

                // Simulated network/processing delay
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'MockService', 'Critical failure during stream execution.', error);
        } finally {
            store.endStream();
            this.isBusy = false;
            this.abortController = null;
        }
    }
}