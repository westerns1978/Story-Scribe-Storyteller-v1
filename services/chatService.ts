
import { getAiClient } from './api';

// Define the structure for chat history messages
interface ChatHistoryMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

class ChatService {
  /**
   * Sends a chat message entirely Client-Side using Gemini 3.0 Flash.
   * This removes the dependency on the backend for basic chat, ensuring Connie works.
   * @param message The user's current message.
   * @param history The previous conversation history.
   * @returns A promise that resolves to a ReadableStream of the response.
   */
  async sendMessageAndStreamResponse(message: string, history: ChatHistoryMessage[]): Promise<ReadableStream<Uint8Array>> {
      const ai = getAiClient();
      
      const chat = ai.chats.create({
          // FIX: Updated to 'gemini-3-flash-preview' as per current naming conventions for basic text tasks
          model: 'gemini-3-flash-preview',
          history: history.map(h => ({
              role: h.role,
              parts: h.parts
          })),
          config: {
              systemInstruction: "You are Connie, an expert oral historian. Your goal is to interview the user to capture their life story. Be warm, curious, and encouraging. Ask one question at a time. Dig for sensory details. If the user shares a significant memory, acknowledge it deeply before moving on."
          }
      });

      const result = await chat.sendMessageStream({ message });
      
      // Create a readable stream from the async iterable to match the component's expected API
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
