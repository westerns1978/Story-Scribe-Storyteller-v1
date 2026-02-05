
import { GoogleGenAI, Modality } from '@google/genai';

/**
 * Generates audio narration from text using the Gemini TTS model.
 * @param text The text to be converted to speech.
 * @param voiceName The name of the prebuilt voice to use (e.g., 'Puck', 'Kore', 'Fenrir').
 * @returns A promise that resolves to a base64 encoded string of the raw PCM audio data.
 */
export const generateNarration = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
    // A new AI instance should be created for each call if API keys can change.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Please narrate the following story in a warm, gentle, and slightly reflective voice: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                  // Using the selected voice
                  prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
        throw new Error("Audio generation failed: No audio data received from the API.");
    }

    return base64Audio;
};

/**
 * Generates a multi-speaker podcast conversation.
 * @param script The script text containing "Alex:" and "Jamie:" dialogues.
 */
export const generatePodcastAudio = async (script: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                        { speaker: 'Jamie', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } }
                    ]
                }
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Podcast audio generation failed.");
    }
    return base64Audio;
};
