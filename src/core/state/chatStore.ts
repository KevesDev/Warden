import { create } from 'zustand';
import { ChatMessageData, ChatRole } from '@core/contracts/ChatSchema';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Global state manager dedicated to the AI Chat Interface.
 * Maintained as a separate store to prevent monolithic state architecture.
 */
interface ChatState {
    messages: ChatMessageData[];
    isGenerating: boolean;
    
    // Actions
    addMessage: (role: ChatRole, content: string) => void;
    appendAssistantChunk: (chunk: string) => void;
    setGeneratingState: (isGenerating: boolean) => void;
    clearHistory: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isGenerating: false,

    addMessage: (role: ChatRole, content: string) => {
        const newMessage: ChatMessageData = {
            id: crypto.randomUUID(), // Standard browser API for robust unique IDs
            role,
            content,
            timestamp: Date.now()
        };

        set((state) => ({
            messages: [...state.messages, newMessage]
        }));
        
        SystemLogger.log(LogLevel.INFO, 'ChatStore', `Added new ${role} message.`);
    },

    /**
     * Used when the AI is actively streaming text into the chat UI.
     * Appends the chunk to the very last message (which is assumed to be the assistant's).
     */
    appendAssistantChunk: (chunk: string) => {
        set((state) => {
            const updatedMessages = [...state.messages];
            if (updatedMessages.length === 0) return state;

            const lastIndex = updatedMessages.length - 1;
            const lastMessage = updatedMessages[lastIndex];

            if (lastMessage.role === 'assistant') {
                updatedMessages[lastIndex] = {
                    ...lastMessage,
                    content: lastMessage.content + chunk
                };
            }

            return { messages: updatedMessages };
        });
    },

    setGeneratingState: (isGenerating: boolean) => {
        set({ isGenerating });
    },

    clearHistory: () => {
        set({ messages: [], isGenerating: false });
        SystemLogger.log(LogLevel.INFO, 'ChatStore', 'Chat history cleared.');
    }
}));