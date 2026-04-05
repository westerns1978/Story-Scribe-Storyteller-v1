import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import CameraScanner, { ScanResult } from '../../components/CameraScanner';

// ─── Inline icons ──────────────────────────────────────────────────────────────
const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </svg>
);
const MicOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
    <path strokeLinecap="round" d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path strokeLinecap="round" d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8" />
  </svg>
);
const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const SparkleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

interface ConnieFullScreenProps {
  subject: string;
  onFinish: (data: { transcript: string }) => void;
  onBack: () => void;
  onRequestPhotos?: () => void;
  onCreateStory?: (subjectName: string) => void;
  resumeContext?: string;
  storytellerName?: string;
  chapterContext?: string;
}

// ─── Animated waveform ─────────────────────────────────────────────────────────
const VoiceWaveform: React.FC<{ isActive: boolean; isConnieSpeaking: boolean }> = ({ isActive, isConnieSpeaking }) => {
  const bars = 24;
  return (
    <div className="flex items-center justify-center gap-[3px] h-14">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = (i * 0.06) % 0.9;
        return (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: '3px',
              minHeight: '3px',
              maxHeight: '56px',
              height: isActive ? undefined : '3px',
              background: isConnieSpeaking
                ? `rgba(196,151,59,${0.5 + Math.sin(i * 0.7) * 0.4})`
                : isActive
                ? `rgba(255,255,255,${0.2 + Math.sin(i * 0.4) * 0.15})`
                : 'rgba(255,255,255,0.12)',
              animation: isActive
                ? `waveBar ${0.7 + delay}s ease-in-out ${delay}s infinite alternate`
                : 'none',
              transition: 'background 0.4s',
            }}
          />
        );
      })}
      <style>{`
        @keyframes waveBar {
          from { height: 3px; }
          to { height: ${isConnieSpeaking ? '44px' : '18px'}; }
        }
      `}</style>
    </div>
  );
};

// ─── Transcript message bubble ─────────────────────────────────────────────────
const MessageBubble: React.FC<{ role: 'user' | 'connie' | 'model'; text: string }> = ({ role, text }) => (
  <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
    <div
      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed font-serif ${
        role === 'user'
          ? 'bg-white/10 text-white/80 rounded-br-sm'
          : 'bg-heritage-warmGold/15 text-heritage-warmGold/90 rounded-bl-sm border border-heritage-warmGold/20'
      }`}
    >
      {text}
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
export const ConnieFullScreen: React.FC<ConnieFullScreenProps> = ({
  subject,
  onFinish,
  onBack,
  onRequestPhotos,
  onCreateStory,
  resumeContext,
  storytellerName,
  chapterContext,
}) => {
  const {
    connect, disconnect,
    isListening, isConnecting, isConnieSpeaking,
    messages, connectionError,
    getTranscript,
    videoRef: liveVideoRef, canvasRef: liveCanvasRef,
  } = useGeminiLive({ subjectName: subject, storytellerName, resumeContext });

  const transcriptRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [photoPromptReason, setPhotoPromptReason] = useState('');
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [createSubjectName, setCreateSubjectName] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for Connie's function call events
  useEffect(() => {
    const handleAction = (e: Event) => {
      const { name, args } = (e as CustomEvent).detail;

      if (name === 'request_photos') {
        setPhotoPromptReason(args?.reason || 'Photos will bring the story to life.');
        setShowPhotoPrompt(true);
      }
      if (name === 'create_story') {
        setCreateSubjectName(args?.subject_name || subject);
        setShowCreatePrompt(true);
      }
      if (name === 'save_progress') {
        setSessionSaved(true);
        setTimeout(() => setSessionSaved(false), 4000);
      }
      if (name === 'navigate') {
        if (args?.destination === 'back') onBack();
      }
    };
    window.addEventListener('connie-action', handleAction);
    return () => window.removeEventListener('connie-action', handleAction);
  }, [subject, onBack]);

  // ── Mic button handler — init on first tap, record on subsequent taps ─────────
  const handleMicPress = useCallback(async () => {
    if (isListening) {
      disconnect();
    } else {
      connect();
    }
  }, [isListening, connect, disconnect]);

  const handleFinish = useCallback(() => {
    const transcript = getTranscript();
    disconnect();
    onFinish({ transcript });
  }, [getTranscript, disconnect, onFinish]);

  const handlePhotoAccept = () => {
    setShowPhotoPrompt(false);
    if (onRequestPhotos) onRequestPhotos();
    else fileInputRef.current?.click();
  };

  const handleConnieScanComplete = (scan: ScanResult) => {
    setIsScannerOpen(false);
    const parts: string[] = [];
    if (scan.documentType) parts.push(`A ${scan.documentType}`);
    if (scan.era) parts.push(`from the ${scan.era}`);
    if (scan.description) parts.push(scan.description);
    if (scan.transcribedText) parts.push(`The text reads: "${scan.transcribedText.substring(0, 300)}"`);
    if (scan.keyFacts?.length) parts.push(`Key facts: ${scan.keyFacts.join(', ')}`);
    if (scan.storyContribution) parts.push(scan.storyContribution);
    const summary = parts.filter(Boolean).join('. ');
    // Dispatch as connie-action so the live session sees the context
    if (summary) {
      window.dispatchEvent(new CustomEvent('connie-scan-context', { detail: { summary } }));
    }
  };

  const handleCreateAccept = () => {
    setShowCreatePrompt(false);
    const transcript = getTranscript();
    disconnect();
    onFinish({ transcript }); // ALWAYS save transcript first
    if (onCreateStory) onCreateStory(createSubjectName);
  };

  // ── Status label ──────────────────────────────────────────────────────────────
  const connieStatus = isConnecting
    ? 'Connecting...'
    : isConnieSpeaking
    ? 'Speaking...'
    : isListening
    ? 'Listening'
    : 'Tap to talk';

  return (
    <div
      className="h-full w-full flex flex-col relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1C1005 0%, #0D0B0A 70%)' }}
    >
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(196,151,59,0.08) 0%, transparent 70%)' }} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 relative z-10">
        <button
          onClick={() => { disconnect(); onBack(); }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 text-white/50" />
        </button>
        <div className="text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.35em] text-heritage-warmGold/50">Wissums</div>
          <div className="text-white/40 text-[8px] font-serif italic mt-0.5">
            {subject ? `Preserving ${subject}'s story` : 'Memory gathering'}
          </div>
        </div>
        <button
          onClick={() => setShowTranscript(v => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          title="View conversation"
        >
          <span className="text-white/40 text-[10px] font-black">
            {messages.length > 0 ? messages.length : '··'}
          </span>
        </button>
      </div>

      {/* ── Connie portrait ── */}
      <div className="flex flex-col items-center pt-4 pb-2 relative z-10">
        <div className="relative">
          <div
            className="absolute -inset-3 rounded-full pointer-events-none transition-all duration-700"
            style={{
              background: isConnieSpeaking
                ? 'radial-gradient(circle, rgba(196,151,59,0.25) 0%, transparent 70%)'
                : 'transparent',
            }}
          />
          <div
            className="w-28 h-28 rounded-full overflow-hidden border-2 transition-all duration-500"
            style={{
              borderColor: isConnieSpeaking ? 'rgba(196,151,59,0.6)' : 'rgba(255,255,255,0.08)',
              boxShadow: isConnieSpeaking ? '0 0 30px rgba(196,151,59,0.2)' : 'none',
            }}
          >
            <img
              src="https://storage.googleapis.com/westerns1978-digital-assets/Websites/wissums/connie-ai.png"
              alt="Connie"
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />

          </div>
        </div>

        <div className="mt-3 text-center">
          <div className="text-white font-display font-black text-xl tracking-wide">Connie</div>
          <div className="text-[9px] font-black uppercase tracking-[0.35em] mt-1 transition-colors duration-300"
            style={{ color: isConnieSpeaking ? 'rgba(196,151,59,0.8)' : 'rgba(255,255,255,0.25)' }}>
            {connieStatus}
          </div>
        </div>
      </div>

      {/* ── Waveform ── */}
      <div className="px-8 py-2 relative z-10">
        <VoiceWaveform isActive={isConnieSpeaking || isListening} isConnieSpeaking={isConnieSpeaking} />
      </div>

      {/* ── Last message from Connie ── */}
      <div className="flex-1 px-6 relative z-10 overflow-hidden">
        {(() => {
          const lastConnie = [...messages].reverse().find(m => m.role === 'connie' || m.role === 'model');
          if (!lastConnie && !isListening) {
            return (
              <div className="h-full flex items-center justify-center">
                <p className="text-white/20 font-serif italic text-base text-center leading-relaxed max-w-xs">
                  Tap the button below to meet Connie.<br />She'll guide you gently through {subject ? `${subject}'s` : 'your'} story.
                </p>
              </div>
            );
          }
          if (!lastConnie && isConnecting) {
            return (
              <div className="h-full flex items-center justify-center">
                <p className="text-heritage-warmGold/40 font-serif italic text-sm animate-pulse">Connie is preparing...</p>
              </div>
            );
          }
          if (lastConnie) {
            return (
              <div className="h-full flex items-center justify-center px-2">
                <p className="font-serif italic text-center leading-relaxed text-lg"
                  style={{ color: 'rgba(245,236,215,0.75)' }}>
                  "{lastConnie.text}"
                </p>
              </div>
            );
          }
          return null;
        })()}

        {/* Error display — shows actual error for debugging */}
        {connectionError && (
          <div className="mt-3 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 mx-2">
            <p className="text-red-300/80 text-xs font-mono text-center">{connectionError}</p>
          </div>
        )}

        {/* Session saved */}
        {sessionSaved && (
          <div className="mt-3 bg-green-900/20 border border-green-500/20 rounded-xl px-4 py-3 mx-2">
            <p className="text-green-400/80 text-xs font-serif text-center">✓ Your memories have been saved.</p>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="px-6 pb-8 pt-4 relative z-10">
        <div className="flex items-center justify-center gap-5 mb-5">

          {/* Photo + scan buttons — only after conversation started */}
          {messages.length > 0 && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all border"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                title="Upload a photo"
              >
                <PhotoIcon className="w-5 h-5 text-white/40" />
              </button>

              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all border"
                style={{ background: 'rgba(196,151,59,0.08)', borderColor: 'rgba(196,151,59,0.25)' }}
                title="Scan a photo, letter, or document"
              >
                <svg className="w-5 h-5" style={{ color: 'rgba(196,151,59,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </button>
            </>
          )}

          {/* Spacer when side buttons hidden */}
          {(messages.length === 0) && <div className="w-12 h-12" />}

          {/* Main mic / start button */}
          <button
            onClick={handleMicPress}
            disabled={isConnecting}
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-heritage-warmGold/30 relative"
            style={{
              background: isListening
                ? 'linear-gradient(135deg, #8B2E3B 0%, #6B1E2B 100%)'
                : (isConnecting)
                ? 'rgba(255,255,255,0.05)'
                : false
                ? 'linear-gradient(135deg, #C4973B 0%, #A07830 100%)'
                : 'linear-gradient(135deg, #C4973B 0%, #A07830 100%)',
              boxShadow: isListening
                ? '0 0 0 4px rgba(139,46,59,0.3), 0 8px 24px rgba(0,0,0,0.5)'
                : (isConnecting)
                ? 'none'
                : '0 0 0 4px rgba(196,151,59,0.2), 0 8px 24px rgba(0,0,0,0.5)',
              opacity: (isConnecting) ? 0.5 : 1,
            }}
          >
            {(isConnecting) ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            ) : isListening ? (
              <MicOffIcon className="w-7 h-7 text-white" />
            ) : (
              <MicIcon className="w-7 h-7 text-white" />
            )}
            {isListening && (
              <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: 'rgba(139,46,59,0.5)' }} />
            )}
          </button>

          {/* Create story button — visible after enough conversation */}
          {messages.length >= 8 && !isListening && (
            <button
              onClick={() => { setCreateSubjectName(subject); setShowCreatePrompt(true); }}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-heritage-warmGold/15 hover:bg-heritage-warmGold/25 border border-heritage-warmGold/30"
              title="Create the story"
            >
              <SparkleIcon className="w-5 h-5 text-heritage-warmGold/70" />
            </button>
          )}

          {/* Spacer */}
          {(messages.length < 8 || isListening) && <div className="w-12 h-12" />}
        </div>

        {/* Hint text */}
        <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
          {false
            ? 'Tap to meet Connie'
            : isConnecting
            ? 'Please wait...'
            : isConnieSpeaking
            ? 'Connie is speaking'
            : isListening
            ? 'Tap to stop & send'
            : 'Tap to talk'}
        </p>

        {/* Save session */}
        {messages.length >= 4 && !isListening && (
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={handleFinish}
              className="px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              Save & Continue Later
            </button>
          </div>
        )}
      </div>

      {/* ── Transcript drawer ── */}
      {showTranscript && (
        <div className="absolute inset-0 z-20 flex flex-col" style={{ background: 'rgba(13,11,10,0.97)' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/40">Conversation</span>
            <button onClick={() => setShowTranscript(false)} className="text-white/30 hover:text-white/60 text-xl leading-none">×</button>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="text-white/20 font-serif italic text-sm text-center pt-8">No messages yet.</p>
            ) : (
              messages.map((m, i) => <MessageBubble key={i} role={m.role} text={m.text} />)
            )}
          </div>
        </div>
      )}

      {/* ── Photo prompt modal ── */}
      {showPhotoPrompt && (
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-10 px-5" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, #1C1208 0%, #0D0B0A 100%)', border: '1px solid rgba(196,151,59,0.2)' }}>
            <div className="text-center">
              <PhotoIcon className="w-8 h-8 text-heritage-warmGold/60 mx-auto mb-2" />
              <h3 className="text-white font-display font-black text-lg">Add Photos</h3>
              <p className="text-white/50 font-serif italic text-sm mt-1 leading-relaxed">{photoPromptReason}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPhotoPrompt(false)} className="flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 hover:bg-white/10 border border-white/10 transition-all">Not Now</button>
              <button onClick={handlePhotoAccept} className="flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-heritage-warmGold hover:bg-heritage-warmGold/90 transition-all">Add Photos</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create story prompt modal ── */}
      {showCreatePrompt && (
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-10 px-5" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, #1C1208 0%, #0D0B0A 100%)', border: '1px solid rgba(139,46,59,0.3)' }}>
            <div className="text-center">
              <SparkleIcon className="w-8 h-8 text-heritage-warmGold mx-auto mb-2" />
              <h3 className="text-white font-display font-black text-lg">Weave the Story</h3>
              <p className="text-white/50 font-serif italic text-sm mt-1 leading-relaxed">
                Connie is ready to weave {createSubjectName || subject}'s memories into a legacy story.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreatePrompt(false)} className="flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 bg-white/5 hover:bg-white/10 border border-white/10 transition-all">Keep Talking</button>
              <button onClick={handleCreateAccept} className="flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-white bg-heritage-burgundy hover:bg-heritage-burgundy/90 transition-all">✦ Create It</button>
            </div>
          </div>
        </div>
      )}

      <CameraScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleConnieScanComplete}
        mode="auto"
        subjectName={subject}
      />
    </div>
  );
};

export default ConnieFullScreen;
