import { SystemLogger, LogLevel } from '@core/utils/systemLogger';
import { MockSample, MOCK_SAMPLES } from './mockSamples';

/**
 * Headless service simulating high-velocity LLM code streaming.
 * Consumes externalized "dirty" samples sequentially to predictably test the Warden Engine.
 * Implements an interruption mechanism to prevent state corruption on user abort.
 */
export class MockService {
    private static abortController: AbortController | null = null;
    private static currentIndex: number = 0;

    /**
     * Executes the simulated AI stream.
     * Sequentially selects a payload from the decoupled mockSamples library.
     */
    public static async *generateStream(prompt: string): AsyncGenerator<string, void, unknown> {
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Execute sequential selection
        const sampleKeys = Object.keys(MOCK_SAMPLES) as MockSample[];
        
        // Failsafe: Reset if index somehow exceeds bounds due to hot-reloading
        if (this.currentIndex >= sampleKeys.length) {
            this.currentIndex = 0;
        }

        const selectedKey = sampleKeys[this.currentIndex];
        const fullPayload = MOCK_SAMPLES[selectedKey];

        // Increment and wrap around for the next prompt
        this.currentIndex = (this.currentIndex + 1) % sampleKeys.length;

        SystemLogger.log(LogLevel.INFO, 'MockService', `Processing Prompt: "${prompt}". Sequentially selected payload profile: [${selectedKey}]`);

        // Simulate initial network handshake latency
        await new Promise(resolve => setTimeout(resolve, 350));

        let i = 0;
        while (i < fullPayload.length) {
            if (signal.aborted) {
                SystemLogger.log(LogLevel.INFO, 'MockService', 'Simulated stream gracefully aborted by user.');
                return;
            }

            // Erratic token delivery mimicking actual LLM behavior (1 to 5 characters per tick)
            const chunkSize = Math.floor(Math.random() * 5) + 1;
            const chunk = fullPayload.slice(i, i + chunkSize);
            
            yield chunk;
            
            i += chunkSize;

            // Simulate processing latency between token batches to ensure React frame unblocking
            await new Promise(resolve => setTimeout(resolve, 12));
        }
    }

    /**
     * Immediately interrupts the active generator stream.
     */
    public static abortStream(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            SystemLogger.log(LogLevel.INFO, 'MockService', 'Active stream aborted by user.');
        }
    }
}