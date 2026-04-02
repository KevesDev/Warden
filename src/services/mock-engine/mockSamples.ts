/**
 * Defines the available heuristic test profiles for the MockService.
 */
export type MockSample = 'placeholder' | 'hallucination' | 'fragment';

/**
 * Library of static, "dirty" code samples designed to reliably trigger 
 * the Warden Engine's AST and Regex parsing layers.
 * Externalized to maintain Extreme Decoupling from the streaming logic.
 */
export const MOCK_SAMPLES: Record<MockSample, string> = {
    placeholder: `
const handleSubmission = async (data) => {
    // TODO: Implement actual validation logic
    console.log("Data received:", data);
    /* FIXME: This is a temporary resolution for the race condition */
    await saveToDisk(data);
};`,
    hallucination: `
import { editorStore } from '@core/state/editorStore';

export const syncNodes = () => {
    const root = editorStore.getState().rootNode;
    // Warden Engine should flag this: WardenInternal is not imported or defined locally.
    WardenInternal.computeQuantumHash(root);
};`,
    fragment: `
function unfinishedLogic() {
    const value = Math.random();
    if (value > 0.5) {
        return "SUCCESS...`
};