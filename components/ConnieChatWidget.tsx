import React, { useState, useEffect, useRef } from 'react';
import { ConnieMessage } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import ImageIcon from './icons/ImageIcon';
import { VisualAuditPanel } from './VisualAuditPanel';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { getStoryTranscript, extractNameFromConversation, saveConversation } from '../services/chatService';

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
    description: 'Moves the user to a different screen in the app.',
    properties: {
      view: { type: Type.STRING, description: 'The target view: "welcome", "restore-studio", "archive", "new-story"' }
    },
    required: ['view']
  }
};

const createFinalStory: FunctionDeclaration = {
  name: 'createFinalStory',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this when the interview is complete.',
    properties: {},
    required: []
  }
};

const capturePhotoArtifact: FunctionDeclaration = {
    name: 'capturePhotoArtifact',
    parameters: {
        type: Type.OBJECT,
        description: 'Captures a high-resolution photo from the camera.',
        properties: {
            description: { type: Type.STRING, description: 'Brief description' }
        },
        required: ['description']
    }
};

function buildConniePrompt(options?: { language?: string; subjectName?: string }): string {
    const lang = options?.language || 'English';
    const subject = options?.subjectName || 'their loved one';
    
    return `You are Connie, a warm and patient memory curator for Story Scribe.
PERSONA: Warm, grandmotherly, favorite aunt. Patient, encouraging.
LANGUAGE: ${lang}.
SUBJECT: ${subject}.
TOOLS: navigateTo, createFinalStory, capturePhotoArtifact.
RULES: Focus on five senses. Don't rush. Confirm before generating stories.`;
}

interface ConnieChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onConversationEnd: (data: { 
      transcript: string; 
      storytellerName: string; 
      artifacts?: {data: string, mimeType: string, description: string}[]
  }) => void;
  onExecuteCommand: (command: string, args: any) => void;
  initialGreeting?: string;
}

const ConnieAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl', isLive?: boolean }> = ({ size = 'sm', isLive }) => {
    const sizeClasses = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-20 h-20', xl: 'w-48 h-48' };
    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-warm border-2 ${isLive ? 'border-heritage-sage animate-pulse' : 'border-heritage-parchment'} relative bg-heritage-linen transition-all duration-300 connie-fab`}>
            <img src="https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png" alt="Connie AI" className="w-full h-full object-cover"/>
        </div>
    );
};

const ConnieChatWidget: React.FC<ConnieChatWidgetProps> = ({ 
    isOpen, onToggle, onConversationEnd, onExecuteCommand, initialGreeting
}) => {
    const [messages, setMessages] = useState<ConnieMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isVisualAuditOpen, setIsVisualAuditOpen] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [capturedArtifacts, setCapturedArtifacts] = useState<{data: string, mimeType: string, description: string}[]>([]);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const [isVideoActive, setIsVideoActive] = useState(false);

    useEffect(() => {
        const defaultGreeting = "Hello! I am Connie. I'm here to listen to your stories and help preserve them. Who is the wonderful person we're remembering today?";
        setMessages([
            { 
                role: 'model', 
                text: initialGreeting || defaultGreeting, 
                actions: !initialGreeting ? [{ label: '🎙️ Start Interview', value: 'start_story' }] : [] 
            }
        ]);
    }, [initialGreeting]);

    useEffect(() => { 
      if (isOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
      }
    }, [messages, isOpen]);

    useEffect(() => {
      return () => {
        if (isLiveActive) stopLiveSession();
      };
    }, [isLiveActive]);

    const stopVideoStream = () => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        setIsVideoActive(false);
    };

    const startVideoStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: 640, height: 480 },
                audio: false 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsVideoActive(true);
            
            frameIntervalRef.current = window.setInterval(() => {
                if (canvasRef.current && videoRef.current && sessionPromiseRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d')!;
                    canvas.width = 640;
                    canvas.height = 480;
                    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    const base64 = dataUrl.split(',')[1];
                    
                    sessionPromiseRef.current.then(session => {
                        session.sendRealtimeInput({
                            media: { data: base64, mimeType: 'image/jpeg' }
                        });
                    });
                }
            }, 1500); 
        } catch (err) {
            console.error('[Connie] Camera access failed:', err);
            setStatusMessage("Camera unavailable");
        }
    };

    const captureHighResPhoto = (): string | null => {
        if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')!;
            canvas.width = videoRef.current.videoWidth || 1280;
            canvas.height = videoRef.current.videoHeight || 720;
            ctx.drawImage(videoRef.current, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.9);
        }
        return null;
    };

    const stopLiveSession = async () => {
        stopVideoStream();
        const transcript = getStoryTranscript(messages);
        const name = extractNameFromConversation(messages);
        
        if (transcript) {
            onConversationEnd({ 
                transcript, 
                storytellerName: name || 'Storyteller',
                artifacts: capturedArtifacts
            });
            saveConversation(name || 'Storyteller', messages);
        }

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
        setStatusMessage("Connecting...");
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContextRef.current.createGain();

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const storytellerName = extractNameFromConversation(messages);
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                systemInstruction: buildConniePrompt({ language: selectedLanguage, subjectName: storytellerName || undefined }),
                tools: [{ functionDeclarations: [navigateTo, createFinalStory, capturePhotoArtifact] }],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: async () => {
                    setStatusMessage("Listening...");
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
                            if (fc.name === 'capturePhotoArtifact') {
                                const photo = captureHighResPhoto();
                                if (photo) {
                                    const base64 = photo.split(',')[1];
                                    setCapturedArtifacts(prev => [...prev, { 
                                        data: base64, 
                                        mimeType: 'image/jpeg', 
                                        description: (fc.args?.description as string) || 'Photo captured during interview' 
                                    }]);
                                    setMessages(prev => [...prev, { role: 'user', text: `[📸 Photo captured: ${fc.args?.description || 'Artifact'}]` }]);
                                }
                            } else {
                                onExecuteCommand(fc.name, fc.args);
                                if (fc.name === 'createFinalStory') {
                                    stopLiveSession();
                                }
                            }
                            
                            sessionPromise.then(s => s.sendToolResponse({
                                functionResponses: { id: fc.id, name: fc.name, response: { result: "Success" } }
                            }));
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
            setMessages(prev => [...prev, { role: 'user', text: "[Snapshot captured]" }]);
        }
    };

    return (
        <>
            <div className="fixed bottom-8 right-8 z-[600] flex flex-col items-end gap-6 pointer-events-none">
                {isOpen && (
                    <div className="w-80 h-[500px] bg-white rounded-3xl shadow-warm-lg border border-heritage-parchment pointer-events-auto flex flex-col overflow-hidden animate-appear">
                        <header className="p-5 border-b border-heritage-parchment flex justify-between items-center bg-heritage-linen/30">
                            <div className="flex items-center gap-3">
                                <ConnieAvatar size="sm" isLive={isLiveActive} />
                                <div>
                                    <p className="font-bold text-heritage-ink text-base leading-none">Connie</p>
                                    <p className="text-[10px] text-heritage-sage font-bold mt-1 uppercase tracking-widest">{statusMessage || 'Ready to Listen'}</p>
                                </div>
                            </div>
                            <button onClick={onToggle} className="p-2 hover:bg-heritage-linen rounded-xl transition-colors"><XMarkIcon className="w-5 h-5 text-heritage-inkMuted" /></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-heritage-cream/20">
                            {!isLiveActive && messages.length <= 1 && (
                                <div className="p-4 bg-heritage-linen rounded-2xl mb-4 border border-heritage-parchment/50">
                                    <p className="text-[11px] font-bold text-heritage-inkSoft mb-3 uppercase tracking-widest">Language</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { code: 'English', flag: '🇺🇸' },
                                            { code: 'Español', flag: '🇲🇽' },
                                            { code: 'Français', flag: '🇫🇷' },
                                            { code: '中文', flag: '🇨🇳' },
                                        ].map(lang => (
                                            <button 
                                                key={lang.code}
                                                onClick={() => setSelectedLanguage(lang.code)}
                                                className={`px-3 py-1.5 text-xs rounded-xl border transition-all ${
                                                    selectedLanguage === lang.code 
                                                        ? 'bg-heritage-warmGold text-white border-heritage-warmGold shadow-sm' 
                                                        : 'bg-white text-heritage-inkSoft border-heritage-parchment hover:border-heritage-warmGold'
                                                }`}
                                            >
                                                {lang.flag} {lang.code}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isVideoActive && (
                                <div className="mb-2 rounded-2xl overflow-hidden aspect-video bg-heritage-ink border border-heritage-parchment relative shadow-inner">
                                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-heritage-burgundy text-white text-[8px] font-bold uppercase rounded-full animate-pulse shadow-lg">Vision Active</div>
                                </div>
                            )}

                            {messages.map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-heritage-warmGold text-white rounded-br-none' : 'bg-white text-heritage-inkSoft border border-heritage-parchment rounded-bl-none shadow-sm'}`}>
                                        {m.text}
                                    </div>
                                    {m.actions && (
                                        <div className="flex gap-2 mt-3">
                                            {m.actions.map(a => (
                                                <button key={a.value} onClick={() => handleAction(a.value)} className="px-4 py-2 bg-heritage-burgundy text-white text-[11px] font-bold rounded-xl hover:opacity-90 transition-all uppercase tracking-widest shadow-sm">
                                                    {a.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <video ref={videoRef} className="hidden" muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />

                        <footer className="p-4 border-t border-heritage-parchment bg-white flex gap-3">
                            <button 
                                onClick={isVideoActive ? stopVideoStream : startVideoStream}
                                className={`p-3 rounded-xl transition-all ${isVideoActive ? 'bg-heritage-burgundy text-white' : 'bg-heritage-linen text-heritage-inkSoft hover:text-heritage-burgundy'}`}
                            >
                                <span className="text-base">📷</span>
                            </button>

                            {!isLiveActive ? (
                                <button onClick={startLiveSession} className="p-3 bg-heritage-sage text-white rounded-xl hover:opacity-90 transition-all"><MicrophoneIcon className="w-6 h-6" /></button>
                            ) : (
                                <button onClick={stopLiveSession} className="p-3 bg-heritage-burgundy text-white rounded-xl animate-pulse"><XMarkIcon className="w-6 h-6" /></button>
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
                                className="flex-1 bg-heritage-linen border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-heritage-warmGold outline-none transition-all placeholder:text-heritage-inkMuted"
                            />
                            <button 
                                onClick={() => setIsVisualAuditOpen(!isVisualAuditOpen)} 
                                className={`p-3 transition-colors ${isVisualAuditOpen ? 'text-heritage-warmGold' : 'text-heritage-inkMuted hover:text-heritage-warmGold'}`}
                            >
                                <ImageIcon className="w-6 h-6" />
                            </button>
                        </footer>
                    </div>
                )}
                
                <button onClick={onToggle} className="pointer-events-auto group relative focus:outline-none transition-transform hover:scale-105 active:scale-95 connie-fab">
                    <div className="absolute inset-0 bg-heritage-warmGold rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                    <ConnieAvatar size="lg" isLive={isLiveActive} />
                    {!isOpen && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-heritage-burgundy rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                    )}
                </button>
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