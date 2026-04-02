/**
 * Defines the role of the entity sending the message.
 */
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Contract for a single message within the AI Chat interface.
 */
export interface ChatMessageData {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: number;
}