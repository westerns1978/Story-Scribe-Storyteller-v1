
import React, { useState, useEffect, useRef } from 'react';
import { ConnieMessage } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import ImageIcon from './icons/ImageIcon';
import AudioWaveform from './AudioWaveform';
import { VisualAuditPanel } from './VisualAuditPanel';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';

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

const navigateTo: FunctionDeclaration = {
  name: 'navigateTo',
  parameters: {
    type: Type.OBJECT,
    description: 'Moves the user to a different screen in the app. Use this when the user wants to see their vault, start a new story, or restore a photo.',
    properties: {
      view: { type: Type.STRING, description: 'The target view: "welcome", "restore-studio", "archive", "new-story", "neural-vault"' }
    },
    required: ['view']
  }
};

const createFinalStory: FunctionDeclaration = {
  name: 'createFinalStory',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this when the interview is complete and the user wants to see the finished story.',
    properties: {},
    required: []
  }
};

interface ConnieChatWidgetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConversationEnd: (data: { transcript: string; userResponses: string[]; storytellerName: string }) => void;
  onExecuteCommand: (command: string, args: any) => void;
  initialGreeting?: string;
  hideTrigger?: boolean;
}

const ConnieAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl', isLive?: boolean }> = ({ size = 'sm', isLive }) => {
    const sizeClasses = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-20 h-20', xl: 'w-48 h-48' };
    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-lg border-2 ${isLive ? 'border-amber-500 animate-pulse' : 'border-white/20'} relative bg-slate-200 transition-all duration-300`}>
            <img src="https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png" alt="Connie AI" className="w-full h-full object-cover"/>
        </div>
    );
};

const ConnieChatWidget: React.FC<ConnieChatWidgetProps> = ({ 
    isOpen, setIsOpen, onConversationEnd, onExecuteCommand, initialGreeting, hideTrigger 
}) => {
    const [messages, setMessages] = useState<ConnieMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isMinimized, setIsMinimized] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    const [isVisualAuditOpen, setIsVisualAuditOpen] = useState(false);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const defaultGreeting = "Hello! I am Connie, your personal oral historian. I'm here to listen to your stories and help you preserve them for your family. Would you like to start a new legacy session?";
        setMessages([
            { 
                role: 'model', 
                text: initialGreeting || defaultGreeting, 
                actions: !initialGreeting ? [{ label: '🎙️ Start Interview', value: 'start_story' }] : [] 
            }
        ]);
    }, [initialGreeting]);

    useEffect(() => { if (isOpen) setIsMinimized(false); }, [isOpen]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isMinimized]);

    const stopLiveSession = async () => {
        setIsLiveActive(false);
        setStatusMessage("Offline");
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }
        for (const source of audioSourcesRef.current.values()) { try { source.stop(); } catch(e) {} }
        if(outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
        nextStartTimeRef.current = 0;
    };

    const startLiveSession = async () => {
        setIsLiveActive(true);
        setIsMinimized(false);
        setStatusMessage("Connecting...");
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContextRef.current.createGain();

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                systemInstruction: "You are Connie, a warm and empathetic conversational AI agent for Story Scribe. Your goal is to guide families through oral history interviews. Ask one question at a time. Focus on sensory details and emotional resonance. Acknowledge what the user says with warmth before moving to the next point. You can navigate the UI using navigateTo. If the user wants to see their vault, use navigateTo(view='neural-vault').",
                tools: [{ functionDeclarations: [navigateTo, createFinalStory] }],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: async () => {
                    setStatusMessage("Listening");
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
                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            onExecuteCommand(fc.name, fc.args);
                            sessionPromise.then(s => s.sendToolResponse({
                                functionResponses: { id: fc.id, name: fc.name, response: { result: "Connie executed the command." } }
                            }));
                            if (fc.name === 'createFinalStory') {
                                onConversationEnd({ transcript: messages.map(m => m.text).join('\n'), userResponses: [], storytellerName: 'Storyteller' });
                                stopLiveSession();
                            }
                        }
                    }
                    if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                        const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
                        const source = outputAudioContextRef.current!.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.connect(outputAudioContextRef.current!.destination);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(source);
                    }
                    if (message.serverContent?.inputTranscription?.text) {
                        setMessages(prev => [...prev, { role: 'user', text: message.serverContent!.inputTranscription!.text! }]);
                    }
                    if (message.serverContent?.outputTranscription?.text) {
                        setMessages(prev => [...prev, { role: 'model', text: message.serverContent!.outputTranscription!.text! }]);
                    }
                }
            }
        });
        sessionPromiseRef.current = sessionPromise;
    };

    const handleAction = (value: string) => { if (value === 'start_story') startLiveSession(); };

    const handleCaptureStill = (base64: string) => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.sendRealtimeInput({
                    media: { data: base64, mimeType: 'image/jpeg' }
                });
            });
            setMessages(prev => [...prev, { role: 'user', text: "[Snapshot captured for analysis]" }]);
        }
    };

    return (
        <>
            <div className={`fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none ${hideTrigger ? 'static w-full h-full bottom-0 right-0' : ''}`}>
                {!isMinimized && (
                    <div className="w-80 h-[450px] bg-white rounded-3xl shadow-warm-lg border border-gemynd-soft-peach pointer-events-auto flex flex-col overflow-hidden animate-fade-in-up">
                        <header className="p-4 border-b border-gemynd-soft-peach flex justify-between items-center bg-gemynd-cream/30">
                            <div className="flex items-center gap-3">
                                <ConnieAvatar size="sm" isLive={isLiveActive} />
                                <div>
                                    <p className="font-bold text-gemynd-deep-brown text-sm leading-none">Connie AI</p>
                                    <p className="text-[10px] text-gemynd-terracotta font-mono mt-1 uppercase tracking-tighter">{statusMessage || 'Ready to Listen'}</p>
                                </div>
                            </div>
                            {!hideTrigger && (
                                <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-slate-100 rounded-lg"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
                            )}
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-gemynd-terracotta text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none shadow-sm'}`}>
                                        {m.text}
                                    </div>
                                    {m.actions && (
                                        <div className="flex gap-2 mt-2">
                                            {m.actions.map(a => (
                                                <button key={a.value} onClick={() => handleAction(a.value)} className="px-3 py-1 bg-white border border-gemynd-terracotta text-gemynd-terracotta text-[10px] font-bold rounded-lg hover:bg-gemynd-soft-peach transition-colors uppercase tracking-widest">
                                                    {a.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <footer className="p-3 border-t border-slate-100 bg-white flex gap-2">
                            {!isLiveActive ? (
                                <button onClick={startLiveSession} className="p-2 bg-gemynd-cream text-gemynd-terracotta rounded-full hover:bg-gemynd-soft-peach transition-colors"><MicrophoneIcon className="w-5 h-5" /></button>
                            ) : (
                                <button onClick={stopLiveSession} className="p-2 bg-red-100 text-red-500 rounded-full animate-pulse"><XMarkIcon className="w-5 h-5" /></button>
                            )}
                            <input
                                type="text" value={input} onChange={e => setInput(e.target.value)}
                                onKeyPress={e => {
                                    if (e.key === 'Enter') {
                                        setMessages(prev => [...prev, { role: 'user', text: input }]);
                                        setInput('');
                                    }
                                }}
                                placeholder="Message Connie..."
                                className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-xs focus:ring-1 focus:ring-gemynd-terracotta outline-none"
                            />
                            <button 
                                onClick={() => setIsVisualAuditOpen(!isVisualAuditOpen)} 
                                className={`p-2 transition-colors ${isVisualAuditOpen ? 'text-amber-500' : 'text-slate-400 hover:text-gemynd-terracotta'}`}
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                        </footer>
                    </div>
                )}
                
                {!hideTrigger && (
                    <button onClick={() => setIsMinimized(!isMinimized)} className="pointer-events-auto group relative focus:outline-none">
                        <div className="absolute inset-0 bg-gemynd-terracotta rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <ConnieAvatar size="lg" isLive={isLiveActive} />
                        {isMinimized && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gemynd-terracotta rounded-full border-2 border-white flex items-center justify-center shadow-md">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                            </div>
                        )}
                    </button>
                )}
            </div>

            <VisualAuditPanel 
                isOpen={isVisualAuditOpen}
                onClose={() => setIsVisualAuditOpen(false)}
                agentName="CONNIE"
                onCaptureStill={handleCaptureStill}
            />
        </>
    );
};

export default ConnieChatWidget;
