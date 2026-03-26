// components/CameraScanner.tsx
// ============================================
// Universal Scan Input for Story Scribe
// ============================================
// Three paths to capture a physical item:
//   1. CAMERA — photograph a document/photo with device camera
//   2. FILE UPLOAD — select from device (mobile/desktop)
//   3. SCANNER — FlowHub bridge (TWAIN USB or eSCL WiFi)
//
// After capture, sends to cascade analyze_photo or analyze_document
// Returns ScanResult to GatheringScreen
// ============================================

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanResult {
  base64: string;
  mimeType: string;
  type: 'photo' | 'document';
  documentType?: string;
  era?: string;
  description?: string;
  transcribedText?: string;
  keyFacts?: string[];
}

interface CameraScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onClose: () => void;
}

type Mode = 'choose' | 'camera' | 'uploading' | 'scanning' | 'analyzing' | 'preview';

// ─── Cascade helper ───────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://ldzzlndsspkyohvzfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkenpsbmRzc3BreW9odnpmaWl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTEzMDUsImV4cCI6MjA3NzI4NzMwNX0.SK2Y7XMzeGQoVMq9KAmEN1vwy7RjtbIXZf6TyNneFnI';
const CASCADE_URL = `${SUPABASE_URL}/functions/v1/story-cascade`;

async function analyzeImage(base64: string, mimeType: string, isDoc: boolean): Promise<Partial<ScanResult>> {
  try {
    const res = await fetch(CASCADE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: isDoc ? 'analyze_document' : 'analyze_photo',
        image_base64: base64,
        mime_type: mimeType,
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const a = data.analysis || {};
    if (isDoc) {
      return {
        type: 'document',
        documentType: a.document_type || 'Document',
        era: a.estimated_era,
        description: a.description,
        transcribedText: a.transcribed_text,
        keyFacts: a.key_facts || [],
      };
    } else {
      const textFacts = Object.values(a.visible_text || {})
        .filter((v): v is string => !!v && v !== 'null');
      return {
        type: 'photo',
        documentType: 'Photo',
        era: a.estimated_era,
        description: [a.physical_description, a.setting_clues].filter(Boolean).join(' · '),
        keyFacts: [...(a.verified_facts || []), ...textFacts].slice(0, 6),
      };
    }
  } catch {
    return {};
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const CameraScanner: React.FC<CameraScannerProps> = ({ onScanComplete, onClose }) => {
  const [mode, setMode] = useState<Mode>('choose');
  const [isDoc, setIsDoc] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null);
  const [scannerIp, setScannerIp] = useState(() => {
    try { return JSON.parse(localStorage.getItem('storyscribe_scan_prefs') || '{}').preferredIp || ''; }
    catch { return ''; }
  });
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Check FlowHub bridge
  useEffect(() => {
    fetch('http://localhost:8585/health', { signal: AbortSignal.timeout(2500) })
      .then(r => r.ok ? r.json() : null)
      .then(d => setBridgeOnline(!!d))
      .catch(() => setBridgeOnline(false));
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Process any captured base64 image ─────────────────────────────────────
  const processImage = useCallback(async (base64: string, mimeType: string) => {
    const dataUrl = `data:${mimeType};base64,${base64}`;
    setPreview(dataUrl);
    setMode('analyzing');
    setStatus('Connie is reading this...');

    const analysis = await analyzeImage(base64, mimeType, isDoc);

    const result: ScanResult = {
      base64,
      mimeType,
      type: isDoc ? 'document' : 'photo',
      documentType: isDoc ? 'Document' : 'Photo',
      ...analysis,
    };

    setPendingResult(result);
    setMode('preview');
    setStatus('');
  }, [isDoc]);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setMode('camera');
    setStatus('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e: any) {
      setStatus(`Camera unavailable: ${e.message}`);
    }
  }, []);

  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    const base64 = c.toDataURL('image/jpeg', 0.92).split(',')[1];
    stopCamera();
    await processImage(base64, 'image/jpeg');
  }, [stopCamera, processImage]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMode('uploading');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await processImage(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  }, [processImage]);

  // ── Scanner ────────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    setMode('scanning');
    setStatus('Connecting to scanner...');
    try {
      const { scan } = await import('../services/scanService');
      const result = await scan({
        resolution: 300,
        colorMode: isDoc ? 'grayscale' : 'color',
        scannerIp: scannerIp || undefined,
      }, (msg) => setStatus(msg));
      await processImage(result.base64, result.mimeType);
    } catch (e: any) {
      setStatus(`${e.message.slice(0, 100)}`);
      setMode('choose');
    }
  }, [isDoc, scannerIp, processImage]);

  // ── Confirm and send to story ──────────────────────────────────────────────
  const confirmScan = useCallback(() => {
    if (pendingResult) onScanComplete(pendingResult);
  }, [pendingResult, onScanComplete]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const overlay = (
    <div className="fixed inset-0 z-[700] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#18120e] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 shrink-0">
          <div>
            <p className="text-white font-bold text-base">Add to Story</p>
            <p className="text-white/35 text-xs mt-0.5">Photos, letters, drawings, documents</p>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
          >✕</button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* CHOOSE MODE */}
          {mode === 'choose' && (
            <div className="p-5 space-y-4">

              {/* Photo vs Document toggle */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
                {[
                  { val: false, label: '📷 Photo', sub: 'Old photos, portraits, artwork' },
                  { val: true, label: '📄 Document', sub: 'Letters, obituaries, records' },
                ].map(({ val, label, sub }) => (
                  <button
                    key={String(val)}
                    onClick={() => setIsDoc(val)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all text-left ${isDoc === val ? 'bg-amber-600/80 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
                  >
                    <div>{label}</div>
                    <div className="text-[10px] font-normal opacity-70 mt-0.5">{sub}</div>
                  </button>
                ))}
              </div>

              {/* Connie guidance */}
              <div className="flex gap-3 p-3 bg-amber-600/10 border border-amber-600/20 rounded-2xl">
                <img
                  src="https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/connie-ai.png"
                  alt="Connie"
                  className="w-8 h-8 rounded-full shrink-0 object-cover"
                />
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  {isDoc
                    ? 'Place the document flat and well-lit. I\'ll read every word — handwritten, typed, or printed.'
                    : 'Old photos work beautifully. I\'ll note the era, faces, and any visible text like names or dates.'}
                </p>
              </div>

              {/* Input options */}
              <div className="space-y-2">

                {/* Camera */}
                <button
                  onClick={startCamera}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-600/40 rounded-2xl transition-all group"
                >
                  <span className="text-2xl">📷</span>
                  <div className="text-left">
                    <p className="text-white text-sm font-semibold">Use Camera</p>
                    <p className="text-white/40 text-xs">Point at a {isDoc ? 'document' : 'photo'} and capture</p>
                  </div>
                  <span className="ml-auto text-white/20 group-hover:text-white/40">›</span>
                </button>

                {/* File upload */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-600/40 rounded-2xl transition-all group"
                >
                  <span className="text-2xl">🗂️</span>
                  <div className="text-left">
                    <p className="text-white text-sm font-semibold">Upload File</p>
                    <p className="text-white/40 text-xs">Choose a photo or image from your device</p>
                  </div>
                  <span className="ml-auto text-white/20 group-hover:text-white/40">›</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

                {/* Scanner */}
                <button
                  onClick={() => {
                    if (bridgeOnline) {
                      handleScan();
                    } else {
                      setMode('scanning');
                      setStatus('FlowHub bridge not detected. Enter scanner IP for direct eSCL scan, or start flowhub_bridge.py for TWAIN/USB scanning.');
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-600/40 rounded-2xl transition-all group"
                >
                  <span className="text-2xl">🖨️</span>
                  <div className="text-left">
                    <p className="text-white text-sm font-semibold flex items-center gap-2">
                      Use Scanner
                      {bridgeOnline === true && <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold">READY</span>}
                      {bridgeOnline === false && <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/30 rounded-full font-bold">OFFLINE</span>}
                    </p>
                    <p className="text-white/40 text-xs">
                      {bridgeOnline ? 'TWAIN/USB or eSCL network scanner via FlowHub' : 'Start FlowHub bridge or enter scanner IP'}
                    </p>
                  </div>
                  <span className="ml-auto text-white/20 group-hover:text-white/40">›</span>
                </button>
              </div>
            </div>
          )}

          {/* CAMERA MODE */}
          {mode === 'camera' && (
            <div className="flex flex-col">
              <div className="relative bg-black aspect-[4/3]">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
                {/* Alignment guide */}
                <div className="absolute inset-6 border-2 border-white/30 rounded-xl pointer-events-none" />
                <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-xs">
                  Align the {isDoc ? 'document' : 'photo'} within the frame
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="p-5 flex gap-3">
                <button
                  onClick={() => { stopCamera(); setMode('choose'); }}
                  className="flex-1 py-3 bg-white/10 text-white/60 rounded-2xl text-sm font-semibold hover:bg-white/15 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={captureFromCamera}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-2xl text-sm font-bold hover:bg-amber-500 transition-all"
                >
                  📸 Capture
                </button>
              </div>
              {status && <p className="text-red-400 text-xs text-center px-5 pb-4">{status}</p>}
            </div>
          )}

          {/* SCANNING / UPLOADING */}
          {(mode === 'scanning' || mode === 'uploading') && (
            <div className="p-6 space-y-4">
              {status && !status.includes('not detected') && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-10 h-10 border-2 border-amber-600/40 border-t-amber-600 rounded-full animate-spin" />
                  <p className="text-white/60 text-sm text-center">{status}</p>
                </div>
              )}
              {(status.includes('not detected') || status.includes('offline') || status.includes('failed') || status.includes('FlowHub')) && (
                <div className="space-y-3">
                  <p className="text-white/50 text-xs leading-relaxed">{status}</p>
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs font-semibold uppercase tracking-widest">Scanner IP (eSCL direct)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={scannerIp}
                        onChange={e => setScannerIp(e.target.value)}
                        placeholder="192.168.1.x"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-600/60"
                      />
                      <button
                        onClick={() => {
                          if (scannerIp) {
                            try { localStorage.setItem('storyscribe_scan_prefs', JSON.stringify({ preferredIp: scannerIp })); } catch {}
                            handleScan();
                          }
                        }}
                        disabled={!scannerIp}
                        className="px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-amber-500 transition-all"
                      >
                        Scan
                      </button>
                    </div>
                    <p className="text-white/25 text-[10px]">
                      Find your scanner's IP in its network settings or router. Epson DS-790WN is typically 192.168.1.145.
                    </p>
                  </div>
                  <button onClick={() => setMode('choose')} className="text-white/30 text-xs hover:text-white/50 transition-colors">← Back</button>
                </div>
              )}
            </div>
          )}

          {/* ANALYZING */}
          {mode === 'analyzing' && (
            <div className="p-6 flex flex-col items-center gap-4 py-8">
              {preview && (
                <img src={preview} alt="Captured" className="w-32 h-32 object-cover rounded-2xl border border-white/20 shadow-lg opacity-60" />
              )}
              <div className="w-8 h-8 border-2 border-amber-600/40 border-t-amber-600 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-white text-sm font-semibold">Connie is reading this</p>
                <p className="text-white/40 text-xs mt-1">Extracting text, era, and key facts...</p>
              </div>
            </div>
          )}

          {/* PREVIEW / CONFIRM */}
          {mode === 'preview' && pendingResult && (
            <div className="p-5 space-y-4">
              <div className="flex gap-4">
                {preview && (
                  <img src={preview} alt="Scanned" className="w-20 h-20 object-cover rounded-xl border border-white/20 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{pendingResult.documentType || 'Item'} captured</p>
                  {pendingResult.era && <p className="text-amber-400/70 text-xs mt-0.5">Era: {pendingResult.era}</p>}
                  {pendingResult.description && (
                    <p className="text-white/40 text-xs mt-1 line-clamp-2">{pendingResult.description}</p>
                  )}
                </div>
              </div>

              {pendingResult.transcribedText && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">Connie read this:</p>
                  <p className="text-white/70 text-xs leading-relaxed line-clamp-4">{pendingResult.transcribedText}</p>
                </div>
              )}

              {pendingResult.keyFacts && pendingResult.keyFacts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pendingResult.keyFacts.map((f, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-amber-600/15 text-amber-300/70 rounded-full border border-amber-600/20">
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {!pendingResult.transcribedText && !pendingResult.keyFacts?.length && (
                <p className="text-white/30 text-xs text-center py-2">Connie will weave this into the story visually.</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setPendingResult(null); setPreview(null); setMode('choose'); }}
                  className="flex-1 py-3 bg-white/10 text-white/60 rounded-2xl text-sm font-semibold hover:bg-white/15 transition-all"
                >
                  Rescan
                </button>
                <button
                  onClick={confirmScan}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-2xl text-sm font-bold hover:bg-amber-500 transition-all"
                >
                  ✓ Add to Story
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return overlay;
};

export default CameraScanner;
