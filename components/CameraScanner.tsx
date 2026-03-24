import React, { useRef, useState, useEffect, useCallback } from 'react';

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co/functions/v1/story-cascade';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';

export interface ScanResult {
  type: 'photo' | 'document';
  imageDataUrl: string;       // base64 data URL of the captured frame
  base64: string;             // raw base64 (no prefix)
  // document-specific
  transcribedText?: string;
  documentType?: string;
  description?: string;
  keyFacts?: string[];
  emotionalSignificance?: string;
  storyContribution?: string;
  era?: string;
  // photo-specific (passed through from analyze_photo)
  photoAnalysis?: Record<string, string>;
}

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the full scan result after Gemini Vision analysis */
  onScanComplete: (result: ScanResult) => void;
  /** Hint for the scanning guide overlay */
  mode?: 'auto' | 'photo' | 'document';
  /** Name of subject — shown in the scanning prompt */
  subjectName?: string;
}

type ScanPhase = 'camera' | 'preview' | 'analyzing' | 'result' | 'error';

const CameraScanner: React.FC<CameraScannerProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  mode = 'auto',
  subjectName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<ScanPhase>('camera');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('Analyzing with Gemini Vision...');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // ── Camera lifecycle ──────────────────────────────────────────────────────

  const startCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err: any) {
      setErrorMsg('Camera access denied. Please allow camera permissions and try again.');
      setPhase('error');
    }
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  };

  useEffect(() => {
    if (isOpen) {
      setPhase('camera');
      setCapturedDataUrl(null);
      setCapturedBase64('');
      setAnalysisResult(null);
      setErrorMsg('');
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  // ── Capture ───────────────────────────────────────────────────────────────

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const b64 = dataUrl.split(',')[1];
    setCapturedDataUrl(dataUrl);
    setCapturedBase64(b64);
    stopCamera();
    setPhase('preview');
  };

  // ── Analyze ───────────────────────────────────────────────────────────────

  const detectType = async (b64: string): Promise<'photo' | 'document'> => {
    if (mode === 'photo') return 'photo';
    if (mode === 'document') return 'document';
    // Quick Gemini call to classify
    try {
      const res = await fetch(SUPABASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({
          action: 'analyze_document',
          image_base64: b64,
          mime_type: 'image/jpeg',
        }),
      });
      const data = await res.json();
      const docType: string = data?.analysis?.document_type || '';
      const photoWords = ['photograph', 'photo', 'portrait', 'snapshot', 'image'];
      const isPhoto = photoWords.some(w => docType.toLowerCase().includes(w));
      return isPhoto ? 'photo' : 'document';
    } catch {
      return 'document';
    }
  };

  const handleAnalyze = async () => {
    if (!capturedBase64) return;
    setPhase('analyzing');

    try {
      // Step 1 — always run document analysis (gives us OCR + description + key facts)
      setAnalysisStatus('Running Gemini Vision OCR...');
      const docRes = await fetch(SUPABASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({
          action: 'analyze_document',
          image_base64: capturedBase64,
          mime_type: 'image/jpeg',
        }),
      });
      const docData = await docRes.json();
      const doc = docData?.analysis || {};

      // Step 2 — if it looks like a portrait photo, also run photo analysis
      let photoAnalysis: Record<string, string> | undefined;
      const docType: string = doc.document_type || '';
      const isPortrait = ['photograph', 'photo', 'portrait', 'snapshot'].some(w =>
        docType.toLowerCase().includes(w)
      );

      if (isPortrait || mode === 'photo') {
        setAnalysisStatus('Analyzing portrait details...');
        try {
          const photoRes = await fetch(SUPABASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON}` },
            body: JSON.stringify({
              action: 'analyze_photo',
              photo_data: capturedBase64,
              media_type: 'image/jpeg',
            }),
          });
          const photoData = await photoRes.json();
          photoAnalysis = photoData?.analysis;
        } catch { /* non-fatal */ }
      }

      const result: ScanResult = {
        type: isPortrait ? 'photo' : 'document',
        imageDataUrl: capturedDataUrl!,
        base64: capturedBase64,
        transcribedText: doc.transcribed_text || undefined,
        documentType: doc.document_type,
        description: doc.description,
        keyFacts: doc.key_facts,
        emotionalSignificance: doc.emotional_significance,
        storyContribution: doc.story_contribution,
        era: doc.estimated_era,
        photoAnalysis,
      };

      setAnalysisResult(result);
      setPhase('result');
    } catch (err: any) {
      setErrorMsg('Gemini Vision analysis failed. Please try again.');
      setPhase('error');
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCapturedBase64('');
    setAnalysisResult(null);
    setPhase('camera');
    startCamera();
  };

  const handleAccept = () => {
    if (analysisResult) {
      onScanComplete(analysisResult);
      onClose();
    }
  };

  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-4 pt-safe pt-4 pb-3"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        <button onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-white/90 text-sm font-bold tracking-widest uppercase">
            {phase === 'camera' ? 'Artifact Scanner' :
             phase === 'preview' ? 'Review Capture' :
             phase === 'analyzing' ? 'Analyzing...' :
             phase === 'result' ? 'Scan Complete' : 'Error'}
          </p>
          {subjectName && (
            <p className="text-white/40 text-[10px] tracking-wider">{subjectName}'s Memory</p>
          )}
        </div>

        {phase === 'camera' ? (
          <button onClick={flipCamera}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        ) : <div className="w-10" />}
      </div>

      {/* Main view area */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">

        {/* Live camera */}
        {phase === 'camera' && (
          <>
            <video ref={videoRef} autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[85%] max-w-sm aspect-[3/4]">
                {/* Corner brackets */}
                {[
                  'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                  'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                  'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                  'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 border-[#C4973B] ${cls}`} />
                ))}
                {/* Scan line */}
                <div className="absolute inset-x-0 h-px bg-[#C4973B]/60"
                  style={{ animation: 'scanline 2.5s ease-in-out infinite', top: '50%' }} />
              </div>
            </div>

            {/* Guide text */}
            <div className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none">
              <div className="px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full">
                <p className="text-white/60 text-xs font-medium tracking-widest uppercase">
                  {mode === 'photo' ? 'Frame the photo or portrait' :
                   mode === 'document' ? 'Position document flat in frame' :
                   'Photo, letter, or document'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Captured preview */}
        {(phase === 'preview' || phase === 'analyzing') && capturedDataUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={capturedDataUrl} alt="Captured"
              className="max-w-full max-h-full object-contain" />
            {phase === 'analyzing' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
                {/* Heritage amber spinner */}
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-[#C4973B]/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[#C4973B] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#C4973B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">Gemini Vision</p>
                  <p className="text-[#C4973B] text-sm mt-1 animate-pulse">{analysisStatus}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result display */}
        {phase === 'result' && analysisResult && (
          <div className="absolute inset-0 flex overflow-hidden">
            {/* Left — image */}
            <div className="w-1/3 flex-shrink-0 relative bg-black">
              <img src={analysisResult.imageDataUrl} alt="Scanned"
                className="absolute inset-0 w-full h-full object-cover opacity-80" />
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-sm">
                <p className="text-[10px] text-[#C4973B] font-bold uppercase tracking-widest text-center">
                  {analysisResult.documentType || 'Artifact'}
                </p>
                {analysisResult.era && (
                  <p className="text-[10px] text-white/50 text-center">{analysisResult.era}</p>
                )}
              </div>
            </div>

            {/* Right — analysis */}
            <div className="flex-1 overflow-y-auto bg-[#0D0B0A] p-4 space-y-4">

              {/* OCR text */}
              {analysisResult.transcribedText && (
                <div className="rounded-xl bg-[#C4973B]/10 border border-[#C4973B]/20 p-3">
                  <p className="text-[10px] font-bold text-[#C4973B] uppercase tracking-widest mb-2">
                    Transcribed Text
                  </p>
                  <p className="text-white/80 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                    {analysisResult.transcribedText}
                  </p>
                </div>
              )}

              {/* Description */}
              {analysisResult.description && (
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Description</p>
                  <p className="text-white/70 text-xs leading-relaxed">{analysisResult.description}</p>
                </div>
              )}

              {/* Key facts */}
              {analysisResult.keyFacts && analysisResult.keyFacts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Key Facts</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.keyFacts.map((fact, i) => (
                      <span key={i}
                        className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">
                        {fact}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Story contribution */}
              {analysisResult.storyContribution && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Story Value</p>
                  <p className="text-white/60 text-xs italic leading-relaxed">
                    "{analysisResult.storyContribution}"
                  </p>
                </div>
              )}

              {/* Photo portrait details */}
              {analysisResult.photoAnalysis && (
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Portrait Details</p>
                  <div className="space-y-1">
                    {Object.entries(analysisResult.photoAnalysis)
                      .filter(([k, v]) => v && !['error', 'raw'].includes(k))
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-[10px]">
                          <span className="text-white/30 capitalize min-w-[80px]">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="text-white/60">{v as string}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-white/80 font-medium">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Footer controls */}
      <div className="pb-safe pb-8 pt-4 px-6 flex items-center justify-center gap-4"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}>

        {phase === 'camera' && (
          <button onClick={handleCapture} disabled={!isStreaming}
            className="w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ border: '4px solid rgba(196,151,59,0.6)', background: 'rgba(196,151,59,0.15)' }}
            aria-label="Capture">
            <div className="w-14 h-14 rounded-full bg-[#C4973B]" />
          </button>
        )}

        {phase === 'preview' && (
          <div className="flex gap-4 w-full max-w-sm">
            <button onClick={handleRetake}
              className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-bold text-sm tracking-widest uppercase">
              Retake
            </button>
            <button onClick={handleAnalyze}
              className="flex-1 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase text-[#0D0B0A] flex items-center justify-center gap-2"
              style={{ background: '#C4973B' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Analyze
            </button>
          </div>
        )}

        {phase === 'result' && (
          <div className="flex gap-4 w-full max-w-sm">
            <button onClick={handleRetake}
              className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-bold text-sm tracking-widest uppercase">
              Rescan
            </button>
            <button onClick={handleAccept}
              className="flex-1 py-4 rounded-2xl font-bold text-sm tracking-widest uppercase text-[#0D0B0A] flex items-center justify-center gap-2"
              style={{ background: '#C4973B' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Add to Story
            </button>
          </div>
        )}

        {phase === 'error' && (
          <button onClick={handleRetake}
            className="py-4 px-8 rounded-2xl bg-white/10 text-white font-bold text-sm tracking-widest uppercase">
            Try Again
          </button>
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 10%; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CameraScanner;
