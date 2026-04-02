import { useWardenStore } from '@core/state/wardenStore';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

type MockSample = 'placeholder' | 'hallucination' | 'fragment';

/**
 * Headless service simulating high-velocity LLM code streaming.
 * Provides "dirty" samples to test the Warden Engine's parsing capabilities.
 */
export class MockService {
    private static instance: MockService;
    private isBusy: boolean = false;

    private samples: Record<MockSample, string> = {
        placeholder: `
const handleSubmission = async (data) => {
    // TODO: Implement validation logic
    console.log("Data received:", data);
    /* FIXME: This is a band-aid for the race condition */
    await saveToDisk(data);
};`,
        hallucination: `
import { editorStore } from '@core/state/editorStore';

export const syncNodes = () => {
    const root = editorStore.getState().rootNode;
    // Warden Engine should flag this: WardenInternal is not imported or defined.
    WardenInternal.computeQuantumHash(root);
};`,
        fragment: `
function unfinishedLogic() {
    const value = Math.random();
    if (value > 0.5) {
        return "SUCCESS...`
    };

    public static getInstance(): MockService {
        if (!MockService.instance) {
            MockService.instance = new MockService();
        }
        return MockService.instance;
    }

    /**
     * Starts a simulated stream of code into the global wardenStore.
     * Mimics erratic token delivery (1-5 characters per "tick").
     */
    public async streamCode(type: MockSample, tokensPerSec: number = 20): Promise<void> {
        if (this.isBusy) return;
        this.isBusy = true;

        const store = useWardenStore.getState();
        const code = this.samples[type];
        const delay = 1000 / tokensPerSec;

        store.startStream();

        try {
            let cursor = 0;
            while (cursor < code.length) {
                // Randomize chunk size for realistic "vibe" streaming
                const chunkSize = Math.floor(Math.random() * 5) + 1;
                const chunk = code.substring(cursor, cursor + chunkSize);
                
                store.appendStreamChunk(chunk);
                cursor += chunkSize;

                // Wait for the simulated network delay
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'MockService', 'Stream interrupted.', error);
        } finally {
            store.endStream();
            this.isBusy = false;
        }
    }
}