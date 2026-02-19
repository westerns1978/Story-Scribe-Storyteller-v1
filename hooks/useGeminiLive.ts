
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';

// Helpers for raw PCM audio encoding/decoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Tool Definitions
const navigate: FunctionDeclaration = {
  name: 'navigate',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigate to a specific view in the application.',
    properties: {
      destination: { 
        type: Type.STRING, 
        description: 'Target view: "welcome", "archive", "new-story", "restore-studio"' 
      }
    },
    required: ['destination']
  }
};

const capture_photo: FunctionDeclaration = {
  name: 'capture_photo',
  parameters: {
    type: Type.OBJECT,
    description: 'Trigger the camera to capture a photo of a memory or artifact.',
    properties: {}
  }
};

const create_story: FunctionDeclaration = {
  name: 'create_story',
  parameters: {
    type: Type.OBJECT,
    description: 'Finish the conversation and generate the final legacy story.',
    properties: {
      subjectName: { type: Type.STRING, description: 'Name of the story subject' }
    }
  }
};

const adjust_ui: FunctionDeclaration = {
  name: 'adjust_ui',
  parameters: {
    type: Type.OBJECT,
    description: 'Adjust the user interface for accessibility.',
    properties: {
      largeText: { type: Type.BOOLEAN, description: 'Enable large text mode' }
    }
  }
};

export interface ConnieSessionConfig {
    storytellerName?: string;
    subjectName?: string;
    language?: string;
    enableVideo?: boolean;
}

export function useGeminiLive(config: ConnieSessionConfig) {
    const [isListening, setIsListening] = useState(false);
    const [isVideoActive, setIsVideoActive] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
    
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);

    const buildSystemInstruction = useCallback(() => {
        const lang = config.language || 'English';
        const subject = config.subjectName || 'their loved one';
        return `You are Connie, a warm and patient memory curator for Story Scribe by Gemynd. 
        PERSONA: Warm, grandmotherly, patient, and encouraging. Speak in ${lang}.
        CAPABILITIES: Use tools to navigate, capture photos, and create stories. 
        RULES: Never invent facts. Focus on the five senses. 
        If the camera is on, describe what you see naturally.`;
    }, [config]);

    const connect = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContextRef.current.createGain();
        outputNode.connect(outputAudioContextRef.current.destination);

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                },
                systemInstruction: buildSystemInstruction(),
                tools: [{ functionDeclarations: [navigate, capture_photo, create_story, adjust_ui] }],
                inputAudioTranscription: {},
                outputAudioTranscription: {}
            },
            callbacks: {
                onopen: async () => {
                    setIsListening(true);
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaStreamRef.current = stream;
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle tool calls
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            const event = new CustomEvent('connie-tool-call', { detail: fc });
                            window.dispatchEvent(event);
                            
                            sessionPromise.then(s => s.sendToolResponse({
                                functionResponses: { id: fc.id, name: fc.name, response: { result: "Success" } }
                            }));
                        }
                    }

                    // Handle audio output
                    if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                        const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
                        const source = outputAudioContextRef.current!.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(source);
                    }

                    // Handle transcriptions
                    if (message.serverContent?.inputTranscription?.text) {
                        setMessages(prev => [...prev, { role: 'user', text: message.serverContent!.inputTranscription!.text! }]);
                    }
                    if (message.serverContent?.outputTranscription?.text) {
                        setMessages(prev => [...prev, { role: 'model', text: message.serverContent!.outputTranscription!.text! }]);
                    }
                },
                onclose: () => setIsListening(false),
                onerror: (e) => console.error("Connie Link Failure:", e)
            }
        });

        sessionPromiseRef.current = sessionPromise;
    };

    const disconnect = async () => {
        setIsListening(false);
        stopVideo();
        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }
        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        scriptProcessorRef.current?.disconnect();
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        audioSourcesRef.current.forEach(s => s.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    };

    const startVideo = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsVideoActive(true);
            
            frameIntervalRef.current = window.setInterval(async () => {
                if (canvasRef.current && videoRef.current && sessionPromiseRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d')!;
                    canvas.width = 640;
                    canvas.height = 480;
                    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                    const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
                    
                    const session = await sessionPromiseRef.current;
                    session.sendRealtimeInput({
                        media: { mimeType: 'image/jpeg', data: base64 }
                    });
                }
            }, 1000);
        } catch (err) {
            console.error("Camera node failed:", err);
        }
    };

    const stopVideo = () => {
        if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsVideoActive(false);
    };

    return { connect, disconnect, isListening, isVideoActive, messages, startVideo, stopVideo, videoRef, canvasRef };
}
