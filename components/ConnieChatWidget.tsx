import React, { useState, useEffect, useRef } from 'react';
import { ConnieMessage } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import ImageIcon from './icons/ImageIcon';
import { isWissums, BRAND, CONNIE_PORTRAIT as CONNIE_IMG_URL } from '../utils/brandUtils';
import { VisualAuditPanel } from './VisualAuditPanel';
import { LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { getStoryTranscript, extractNameFromConversation, saveConversation } from '../services/chatService';

// ─── Audio helpers ────────────────────────────────────────────────────────────

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
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

// ─── Function declarations ────────────────────────────────────────────────────

const navigateTo: FunctionDeclaration = {
  name: 'navigateTo',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigate to a view in the app.',
    properties: { view: { type: Type.STRING, description: 'The view to navigate to.' } },
    required: ['view']
  }
};

const createFinalStory: FunctionDeclaration = {
  name: 'createFinalStory',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this when the interview is complete and ready to generate the story.',
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
      description: { type: Type.STRING, description: 'Brief description of what was captured' }
    },
    required: ['description']
  }
};

// ─── Connie system prompt ─────────────────────────────────────────────────────

function buildConniePrompt(options?: { language?: string; subjectName?: string }): string {
  const lang = options?.language || 'English';
  const subject = options?.subjectName || 'their pet';
  return `You are Connie, a warm and ${isWissums ? 'playful pet story curator' : 'compassionate life story curator'} for ${BRAND.name}.
PERSONA: Warm, playful, animal lover. Patient, encouraging, genuinely delighted by pet stories. Never rushed.
LANGUAGE: Respond in ${lang}.
SUBJECT: You are helping preserve the story of a beloved pet named ${subject}.
TOOLS: Use navigateTo to move between app sections. Use createFinalStory when you have enough for a rich story (minimum 5 meaningful exchanges). Use capturePhotoArtifact to capture photos during the interview.
RULES:
- Ask one question at a time.
- Hunt for sensory details — the sound of their bark, the feel of their fur, funny habits, favorite spots.
- If they mention a photo, ask them to hold it up to the camera.
- Acknowledge warmly before moving on. Celebrate this pet's life.
- Never invent or assume facts.
- Confirm with the owner before calling createFinalStory.`;
}

// ─── Cascade edge function helper ────────────────────────────────────────────

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
// Supabase anon key — safe to expose client-side (row-level security enforced server-side)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;

async function fetchEphemeralToken(subjectName: string, voiceName = 'Kore'): Promise<{
  token: string;
  ws_url: string;
  model: string;
}> {
  const res = await fetch(CASCADE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: 'get_token',
      subject_name: subjectName,
      voice_name: voiceName,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`get_token failed (${res.status}): ${err}`);
  }
  return res.json();
}

// ─── Scan button (eSCL driverless scanner) ───────────────────────────────────

interface ScanButtonProps {
  onScanComplete: (base64: string, mimeType: string) => void;
}

const ScanButton: React.FC<ScanButtonProps> = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [scannerIp, setScannerIp] = useState(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('storyscribe_scan_prefs') || '{}');
      return prefs.preferredIp || JSON.parse(localStorage.getItem('storyscribe_scanner_ips') || '[]')[0] || '';
    } catch { return ''; }
  });

  const handleScan = async () => {
    setIsScanning(true);
    setScanStatus('Detecting scanner…');
    try {
      // Dynamically import unified scanService — auto-detects TWAIN, eSCL, SANE
      const { scan, getBridgeStatus, saveScanPrefs } = await import('../services/scanService');

      // Check what's available
      const bridge = await getBridgeStatus();

      // If bridge is offline and no IP configured, show options
      if (!bridge.running && !scannerIp) {
        setIsScanning(false);
        setShowOptions(true);
        return;
      }

      const prefs = JSON.parse(localStorage.getItem('storyscribe_scan_prefs') || '{}');
      const result = await scan({
        resolution: prefs.resolution || 300,
        colorMode: prefs.colorMode || 'color',
        scannerIp: scannerIp || undefined,
      }, (msg) => setScanStatus(msg));

      // Save working IP for next time
      if (result.protocol === 'escl' && scannerIp) {
        saveScanPrefs({ preferredIp: scannerIp });
      }

      onScanComplete(result.base64, result.mimeType);
      setScanStatus(`✓ ${result.protocol.toUpperCase()} — ${Math.round(result.durationMs / 1000)}s`);
      setTimeout(() => setScanStatus(''), 3000);
    } catch (e: any) {
      setScanStatus(`⚠ ${e.message.slice(0, 50)}`);
      setTimeout(() => { setScanStatus(''); setShowOptions(true); }, 3000);
    } finally {
      setIsScanning(false);
    }
  };

  if (showOptions) {
    return (
      <div className="absolute bottom-20 left-4 right-4 bg-white border border-heritage-parchment rounded-2xl p-3 shadow-warm-lg z-10">
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-bold text-heritage-inkSoft uppercase tracking-widest">Scanner Setup</p>
          <button onClick={() => setShowOptions(false)} className="text-heritage-inkMuted text-xs">✕</button>
        </div>
        <p className="text-[10px] text-heritage-inkMuted mb-2">
          For USB/TWAIN scanners: start <strong>flowhub_bridge.py</strong> on this PC first.
          For network scanners: enter the scanner's IP.
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={scannerIp}
            onChange={e => setScannerIp(e.target.value)}
            placeholder="IP for network scanner (optional)"
            className="flex-1 bg-heritage-linen border-none rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-heritage-warmGold"
            onKeyPress={e => { if (e.key === 'Enter') { setShowOptions(false); handleScan(); } }}
          />
          <button
            onClick={() => { setShowOptions(false); handleScan(); }}
            className="px-3 py-2 bg-heritage-sage text-white text-xs font-bold rounded-xl whitespace-nowrap"
          >
            Scan Now
          </button>
        </div>
        <div className="flex gap-2 text-[9px] text-heritage-inkMuted">
          <span>🖨 TWAIN/USB</span>
          <span>📡 eSCL/WiFi</span>
          <span>🐧 SANE/Linux</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleScan}
      disabled={isScanning}
      title={scanStatus || 'Scan photo or document (TWAIN/eSCL/SANE)'}
      className={`p-3 rounded-xl transition-all relative ${
        isScanning
          ? 'bg-heritage-warmGold text-white animate-pulse'
          : 'bg-heritage-linen text-heritage-inkSoft hover:text-heritage-sage hover:bg-heritage-sage/10'
      }`}
    >
      {isScanning ? (
        <span className="text-xs font-bold">⟳</span>
      ) : (
        <span className="text-base">🖨️</span>
      )}
      {scanStatus && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-heritage-ink text-white text-[9px] px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none">
          {scanStatus}
        </span>
      )}
    </button>
  );
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const ConnieAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl'; isLive?: boolean }> = ({ size = 'sm', isLive }) => {
  const sizeClasses = { sm: 'w-10 h-10', md: 'w-12 h-12', lg: 'w-20 h-20', xl: 'w-48 h-48' };
  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-warm border-2 ${isLive ? 'border-heritage-sage animate-pulse' : 'border-heritage-parchment'} relative bg-heritage-linen transition-all duration-300 connie-fab`}>
      <img src={CONNIE_IMG_URL} alt="Connie AI" className="w-full h-full object-cover" />
    </div>
  );
};

// ─── Main widget ──────────────────────────────────────────────────────────────

interface ConnieChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onConversationEnd: (data: {
    transcript: string;
    storytellerName: string;
    artifacts?: { data: string; mimeType: string; description: string }[];
  }) => void;
  onExecuteCommand: (command: string, args: any) => void;
  initialGreeting?: string;
}

const ConnieChatWidget: React.FC<ConnieChatWidgetProps> = ({
  isOpen, onToggle, onConversationEnd, onExecuteCommand, initialGreeting
}) => {
  const [messages, setMessages] = useState<ConnieMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isVisualAuditOpen, setIsVisualAuditOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [capturedArtifacts, setCapturedArtifacts] = useState<{ data: string; mimeType: string; description: string }[]>([]);

  const sessionRef = useRef<any>(null); // raw WebSocket session
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false); // guard against reconnection storm

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);

  useEffect(() => {
    const defaultGreeting = "Hi! I'm Connie. Tell me about your pet \u2014 their name, their personality, their funny habits. Let's preserve their story forever.";
    setMessages([{
      role: 'model',
      text: initialGreeting || defaultGreeting,
      actions: !initialGreeting ? [{ label: '🎙️ Start Interview', value: 'start_story' }] : []
    }]);
  }, [initialGreeting]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    return () => { if (isLiveActive) stopLiveSession(); };
  }, [isLiveActive]);

  const stopVideoStream = () => {
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
    setIsVideoActive(false);
  };

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setIsVideoActive(true);
    } catch (e) { console.warn('Camera unavailable:', e); }
  };

  const captureHighResPhoto = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // ── STOP SESSION ────────────────────────────────────────────────────────────
  const stopLiveSession = () => {
    if (isConnectingRef.current) return; // don't stop mid-connect
    stopVideoStream();
    const transcript = getStoryTranscript(messages);
    const name = extractNameFromConversation(messages);
    if (transcript) {
      onConversationEnd({ transcript, storytellerName: name || 'Storyteller', artifacts: capturedArtifacts });
      saveConversation(name || 'Storyteller', messages);
    }
    setIsLiveActive(false);
    setStatusMessage('Offline');
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    scriptProcessorRef.current?.disconnect();
    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch { /* ignore */ }
      sessionRef.current = null;
    }
    for (const source of audioSourcesRef.current.values()) { try { source.stop(); } catch { /* ignore */ } }
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    nextStartTimeRef.current = 0;
    isConnectingRef.current = false;
  };

  // ── START SESSION — uses ephemeral token from edge function ─────────────────
  const startLiveSession = async () => {
    if (isConnectingRef.current || isLiveActive) return; // storm guard
    isConnectingRef.current = true;
    setIsLiveActive(true);
    setStatusMessage('Connecting…');

    try {
      // 1. Get ephemeral token + pre-built ws_url from Supabase edge function
      const storytellerName = extractNameFromConversation(messages);
      const { token, ws_url, model } = await fetchEphemeralToken(
        storytellerName || 'their pet'
      );

      // 2. Set up audio contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputAudioContextRef.current.createGain();

      // 3. Connect directly via WebSocket using ws_url from edge function
      //    ws_url = wss://generativelanguage.googleapis.com/ws/...v1alpha...Constrained?access_token={token}
      //    This is the correct v1alpha endpoint with token as query param — not v1beta, not API key
      const ws = new WebSocket(ws_url);
      sessionRef.current = ws;

      ws.onopen = () => {
        // Send the LiveConnectConfig as the first message
        const setupMsg = {
          setup: {
            model,
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: { prebuilt_voice_config: { voice_name: 'Kore' } }
              }
            },
            system_instruction: {
              parts: [{ text: buildConniePrompt({ language: selectedLanguage, subjectName: storytellerName || undefined }) }]
            },
            tools: [{ function_declarations: [navigateTo, createFinalStory, capturePhotoArtifact] }],
            input_audio_transcription: {},
            output_audio_transcription: {},
          }
        };
        ws.send(JSON.stringify(setupMsg));
        setStatusMessage('Listening…');
        isConnectingRef.current = false;

        // Start mic after setup sent
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          mediaStreamRef.current = stream;
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptProcessor;
          scriptProcessor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            const audioMsg = {
              realtime_input: {
                media_chunks: [{ data: encode(new Uint8Array(int16.buffer)), mime_type: 'audio/pcm;rate=16000' }]
              }
            };
            ws.send(JSON.stringify(audioMsg));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
        });
      };

      ws.onmessage = async (event) => {
        let message: any;
        try {
          message = JSON.parse(
            event.data instanceof Blob ? await event.data.text() : event.data
          );
        } catch { return; }

        // Tool calls
        if (message.toolCall) {
          for (const fc of message.toolCall.functionCalls || []) {
            if (fc.name === 'capturePhotoArtifact') {
              const photo = captureHighResPhoto();
              if (photo) {
                const base64 = photo.split(',')[1];
                setCapturedArtifacts(prev => [...prev, {
                  data: base64, mimeType: 'image/jpeg',
                  description: (fc.args?.description as string) || 'Photo captured during interview'
                }]);
                setMessages(prev => [...prev, { role: 'user', text: `[📸 Photo captured: ${fc.args?.description || 'Artifact'}]` }]);
              }
            } else {
              onExecuteCommand(fc.name, fc.args);
              if (fc.name === 'createFinalStory') stopLiveSession();
            }
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                tool_response: {
                  function_responses: [{ id: fc.id, name: fc.name, response: { result: 'Success' } }]
                }
              }));
            }
          }
        }

        // Audio response
        const audioPart = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioPart) {
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
          const audioBuffer = await decodeAudioData(decode(audioPart), outputAudioContextRef.current!, 24000, 1);
          const source = outputAudioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputNode);
          source.connect(outputAudioContextRef.current!.destination);
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          audioSourcesRef.current.add(source);
        }

        // Transcriptions
        if (message.serverContent?.inputTranscription?.text) {
          setMessages(prev => [...prev, { role: 'user', text: message.serverContent.inputTranscription.text }]);
        }
        if (message.serverContent?.outputTranscription?.text) {
          setMessages(prev => [...prev, { role: 'model', text: message.serverContent.outputTranscription.text }]);
        }
      };

      ws.onerror = (e) => {
        console.error('[Connie] WebSocket error:', e);
        setStatusMessage('Connection error');
        isConnectingRef.current = false;
      };

      ws.onclose = (e) => {
        console.log('[Connie] WebSocket closed:', e.code, e.reason);
        // Only auto-stop if we were actively connected — not during initial connect
        if (isLiveActive && !isConnectingRef.current) {
          setStatusMessage('Offline');
          setIsLiveActive(false);
        }
        isConnectingRef.current = false;
      };

    } catch (err: any) {
      console.error('[Connie] startLiveSession failed:', err);
      setStatusMessage(`Error: ${err.message.slice(0, 50)}`);
      setIsLiveActive(false);
      isConnectingRef.current = false;
    }
  };

  const handleAction = (value: string) => { if (value === 'start_story') startLiveSession(); };

  // ── Handle scanned image — send to Connie and show in chat ─────────────────
  const handleScanComplete = (base64: string, mimeType: string) => {
    // Add to captured artifacts
    setCapturedArtifacts(prev => [...prev, {
      data: base64,
      mimeType,
      description: 'Scanned document or photo'
    }]);
    setMessages(prev => [...prev, { role: 'user', text: '📄 [Scanned item added to story materials]' }]);
    // If live session active, send image to Connie for real-time reaction
    if (sessionRef.current?.readyState === WebSocket.OPEN) {
      sessionRef.current.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{ data: base64, mime_type: mimeType }]
        }
      }));
    }
  };

  const handleCaptureStill = (base64: string) => {
    if (sessionRef.current?.readyState === WebSocket.OPEN) {
      sessionRef.current.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{ data: base64, mime_type: 'image/jpeg' }]
        }
      }));
    }
    setMessages(prev => [...prev, { role: 'user', text: '[Snapshot captured]' }]);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed bottom-8 right-8 z-[600] flex flex-col items-end gap-6 pointer-events-none">
        {isOpen && (
          <div className="w-80 h-[500px] bg-white rounded-3xl shadow-warm-lg border border-heritage-parchment pointer-events-auto flex flex-col overflow-hidden animate-appear relative">
            <header className="p-5 border-b border-heritage-parchment flex justify-between items-center bg-heritage-linen/30">
              <div className="flex items-center gap-3">
                <ConnieAvatar size="sm" isLive={isLiveActive} />
                <div>
                  <p className="font-bold text-heritage-ink text-base leading-none">Connie</p>
                  <p className="text-[10px] text-heritage-sage font-bold mt-1 uppercase tracking-widest">{statusMessage || 'Ready to Listen'}</p>
                </div>
              </div>
              <button onClick={onToggle} className="p-2 hover:bg-heritage-linen rounded-xl transition-colors">
                <XMarkIcon className="w-5 h-5 text-heritage-inkMuted" />
              </button>
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
                        className={`px-3 py-1.5 text-xs rounded-xl border transition-all ${selectedLanguage === lang.code
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
                  <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user'
                    ? 'bg-heritage-warmGold text-white rounded-br-none'
                    : 'bg-white text-heritage-inkSoft border border-heritage-parchment rounded-bl-none shadow-sm'
                    }`}>
                    {m.text}
                  </div>
                  {m.actions && (
                    <div className="flex gap-2 mt-3">
                      {m.actions.map(a => (
                        <button
                          key={a.value}
                          onClick={() => handleAction(a.value)}
                          className="px-4 py-2 bg-heritage-burgundy text-white text-[11px] font-bold rounded-xl hover:opacity-90 transition-all uppercase tracking-widest shadow-sm"
                        >
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

            <footer className="p-4 border-t border-heritage-parchment bg-white flex gap-3 relative">
              {/* Camera toggle */}
              <button
                onClick={isVideoActive ? stopVideoStream : startVideoStream}
                className={`p-3 rounded-xl transition-all ${isVideoActive ? 'bg-heritage-burgundy text-white' : 'bg-heritage-linen text-heritage-inkSoft hover:text-heritage-burgundy'}`}
              >
                <span className="text-base">📷</span>
              </button>

              {/* Scanner button — bridges physical to digital */}
              <ScanButton onScanComplete={handleScanComplete} />

              {/* Mic toggle */}
              {!isLiveActive ? (
                <button onClick={startLiveSession} className="p-3 bg-heritage-sage text-white rounded-xl hover:opacity-90 transition-all">
                  <MicrophoneIcon className="w-6 h-6" />
                </button>
              ) : (
                <button onClick={stopLiveSession} className="p-3 bg-heritage-burgundy text-white rounded-xl animate-pulse">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              )}

              {/* Text input */}
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && input.trim()) {
                    setMessages(prev => [...prev, { role: 'user', text: input }]);
                    setInput('');
                  }
                }}
                placeholder="Message Connie..."
                className="flex-1 bg-heritage-linen border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-heritage-warmGold outline-none transition-all placeholder:text-heritage-inkMuted"
              />

              {/* Visual audit */}
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
