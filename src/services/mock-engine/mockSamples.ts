/**
 * Defines the available heuristic test profiles for the MockService.
 * Expanded to rigorously stress-test the AAA Tri-Layer Engine (AST, Regex, Entropy).
 */
export type MockSample = 
    | 'ast_hallucination' 
    | 'regex_placeholder' 
    | 'regex_chat_leak' 
    | 'entropy_security' 
    | 'combo_stress_test'
    | 'fragment';

/**
 * Library of static, "dirty" code samples designed to reliably trigger 
 * the Warden Engine's specific heuristic layers.
 * Externalized to maintain Extreme Decoupling from the streaming logic.
 */
export const MOCK_SAMPLES: Record<MockSample, string> = {
    
    // LAYER 1 (AST): Tests the Tree-sitter DependencyMap integration.
    // Warden should flag 'QuantumAuthMatrix' and 'NeuralNetCache' as WDN-AST-MOCK errors.
    ast_hallucination: `
import { editorStore } from '@core/state/editorStore';

export class SessionManager {
    public initializeSession() {
        const root = editorStore.getState().rootNode;
        
        const auth = new QuantumAuthMatrix();
        auth.validateRoot(root);

        NeuralNetCache.flush();
        return true;
    }
}`,

    // LAYER 2 (Regex - Lazy): Tests for MVP tactics and deferred logic.
    // Warden should flag the 'TODO', 'FIXME', and '...' block as WDN-LAZY errors.
    regex_placeholder: `
export const processDataStream = async (streamData: any[]) => {
    // TODO: Implement actual data sanitization before processing
    const sanitized = streamData;
    
    try {
        /* FIXME: Replace this basic loop with a WebWorker for performance */
        for (const item of sanitized) {
            console.log(item);
            ... 
        }
    } catch (e) {
        // insert logic here to handle network failures
        throw e;
    }
};`,

    // LAYER 2 (Regex - Chatty): Tests for conversational AI artifacts leaking into code.
    // Warden should flag the conversational markers as WDN-CHAT warnings.
    regex_chat_leak: `
// Certainly! Here is the updated function you requested:
export function calculateVelocity(distance: number, time: number): number {
    if (time <= 0) return 0;
    
    const velocity = distance / time;
    return velocity;
}
// Please note that you should add error handling for negative distances.
// As an AI, I kept this simple for demonstration purposes.`,

    // LAYER 3 (Entropy): Tests the Shannon Entropy algorithmic scanner.
    // Warden should flag BOTH strings as WDN-SEC-002, regardless of variable naming.
    entropy_security: `
export const fetchCloudConfig = async () => {
    // The Entropy Engine should catch this standard Base64 secret (High Entropy)
    const accessKey = "AKIAIOSFODNN7EXAMPLE";
    
    // The Entropy Engine should also catch this JWT token, even though the variable
    // name 't' tells the regex engine nothing about it being a security risk.
    const t = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6I";

    const response = await fetch('https://api.cloud.net/v1/config', {
        headers: {
            'Authorization': \`Bearer \${t}\`,
            'X-Api-Key': accessKey
        }
    });

    return response.json();
};`,

    // STRESS TEST: Simulates a catastrophic AI response containing all failure states.
    // This verifies that AST parsing, Regex, and Entropy calculations do not block each other.
    combo_stress_test: `
// Sure, I can help you set up the database connector!
import { localStore } from './store';

export class DbConnector {
    private init() {
        // TODO: Move this password to an environment variable later
        const pswd = "aB9#kL2@mPqX!vR5*zY7";
        
        // This is a hallucinated dependency that doesn't exist in the project
        const connection = new EnterpriseSQLDriver();
        
        connection.connect("localhost", pswd);
        
        if (!connection.isReady) {
            ...
        }
    }
}`,

    // TESTS ERROR HANDLING: Simulates an abruptly cut-off AI stream.
    fragment: `
export function unfinishedLogic() {
    const value = Math.random();
    if (value > 0.5) {
        return "SUCCESS`
};