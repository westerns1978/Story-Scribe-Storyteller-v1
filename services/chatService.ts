
import { getAiClient } from './api';
import { ConnieMessage } from '../types';
import { supabase } from './supabaseClient';

// Define the structure for chat history messages
interface ChatHistoryMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

/**
 * Extracts a clean transcript of only the user's spoken memories.
 */
export function getStoryTranscript(messages: ConnieMessage[]): string {
    return messages
        .filter(m => m.role === 'user')
        .map(m => m.text)
        .join('\n\n');
}

/**
 * Heuristic to extract a name from the conversation history.
 * Looks for common patterns in early user responses.
 */
export function extractNameFromConversation(messages: ConnieMessage[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return "";

    for (const msg of userMessages.slice(0, 3)) {
        const text = msg.text.toLowerCase();
        // Look for "My name is X" or "This is about X" or "Sam Western"
        const patterns = [
            /my name is (.*)/i,
            /it's about (.*)/i,
            /talk about (.*)/i,
            /remembering (.*)/i
        ];

        for (const pattern of patterns) {
            const match = msg.text.match(pattern);
            if (match && match[1]) {
                return match[1].split('.')[0].trim();
            }
        }
    }
    return "";
}

/**
 * Saves the raw conversation transcript to the vault for persistence.
 */
export async function saveConversation(storytellerName: string, messages: ConnieMessage[]) {
    const transcript = getStoryTranscript(messages);
    
    const { error } = await supabase.from('storyscribe_conversations').insert({
        storyteller_name: storytellerName,
        full_transcript: transcript,
        connie_messages: messages,
        status: 'ready_for_story',
        created_at: new Date().toISOString()
    });

    if (error) {
        console.warn("[Vault] Conversation backup failed:", error.message);
    }
}

class ChatService {
  /**
   * Sends a chat message entirely Client-Side using Gemini 2.0 Flash.
   * This removes the dependency on the backend for basic chat, ensuring Connie works.
   */
  async sendMessageAndStreamResponse(message: string, history: ChatHistoryMessage[]): Promise<ReadableStream<Uint8Array>> {
      const ai = getAiClient();
      
      const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: history.map(h => ({
              role: h.role,
              parts: h.parts
          })),
          config: {
              systemInstruction: "You are Connie, a warm and playful pet story curator for Wissums. Your goal is to interview the user about their beloved pet. Be warm, playful, and genuinely excited about their pet's story. Ask one question at a time. Dig for sensory details — the sound of their bark, their funny habits, their favorite spot. If the user shares a meaningful memory, acknowledge it warmly before moving on."
          }
      });

      const result = await chat.sendMessageStream({ message });
      
      return new ReadableStream({
          async start(controller) {
              const encoder = new TextEncoder();
              try {
                  for await (const chunk of result) {
                      const text = chunk.text;
                      if (text) {
                          controller.enqueue(encoder.encode(text));
                      }
                  }
                  controller.close();
              } catch (err) {
                  controller.error(err);
              }
          }
      });
  }
}

export const chatService = new ChatService();
