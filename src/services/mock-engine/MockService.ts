import { MOCK_SAMPLES, MockSample } from './mockSamples';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Headless mock service designed to simulate high-velocity LLM code streams.
 * Randomly selects heuristic stress-test profiles and yields them erratically
 * to test UI unblocking and Warden Engine interceptors.
 */
export class MockService {
    private static abortController: AbortController | null = null;

    /**
     * Executes the simulated AI stream.
     * Randomly selects a payload from the decoupled mockSamples library.
     */
    public static async *generateStream(prompt: string): AsyncGenerator<string, void, unknown> {
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        // Extract available keys and execute random selection
        const sampleKeys = Object.keys(MOCK_SAMPLES) as MockSample[];
        const randomIndex = Math.floor(Math.random() * sampleKeys.length);
        const selectedKey = sampleKeys[randomIndex];
        
        const fullPayload = MOCK_SAMPLES[selectedKey];

        SystemLogger.log(LogLevel.INFO, 'MockService', `Processing Prompt: "${prompt}". Randomly selected payload profile: [${selectedKey}]`);

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
        }
    }
}