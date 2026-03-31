import React, { useRef, useState, useEffect, useCallback } from 'react';
import { scan, getAvailableScanners, captureFromCamera, ScannerDevice } from '../services/scanService';
import { analyzeDocumentImage } from '../services/api';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (text: string) => void;
  onImageCaptured?: (base64Png: string) => void; // called for photo captures
}

type Tab = 'camera' | 'scanner';
type CameraState = 'starting' | 'ready' | 'captured' | 'analyzing' | 'denied';
type ScannerState = 'idle' | 'discovering' | 'ready' | 'scanning' | 'done' | 'error';

const BIG_BTN: React.CSSProperties = {
  width: '100%', padding: '22px 16px', borderRadius: 20,
  border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700,
  fontFamily: 'Georgia, serif', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 14, transition: 'all 0.2s',
  letterSpacing: '0.02em',
};

const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen, onClose, onScanComplete, onImageCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [tab, setTab] = useState<Tab>('camera');
  const [cameraState, setCameraState] = useState<CameraState>('starting');
  const [capturedPng, setCapturedPng] = useState<string | null>(null); // base64 PNG
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [scanners, setScanners] = useState<ScannerDevice[]>([]);
  const [selectedScanner, setSelectedScanner] = useState<ScannerDevice | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── Camera lifecycle ──────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraState('starting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('ready');
    } catch {
      setCameraState('denied');
      setTab('scanner'); // auto-switch to scanner if camera denied
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPng(null);
      setCameraState('starting');
      setError(null);
      setScannerState('idle');
      return;
    }
    if (tab === 'camera') startCamera();
    else stopCamera();
  }, [isOpen, tab]);

  // ── Scanner discovery ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || tab !== 'scanner') return;
    setScannerState('discovering');
    setStatusMsg('Looking for scanners…');
    getAvailableScanners().then(found => {
      setScanners(found);
      const available = found.filter(s => s.available);
      setSelectedScanner(available[0] || null);
      setScannerState(available.length > 0 ? 'ready' : 'error');
      if (available.length === 0) setStatusMsg('No scanner found. Is flowhub_bridge.py running?');
      else setStatusMsg('');
    });
  }, [isOpen, tab]);

  // ── Capture from camera ───────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current || cameraState !== 'ready') return;
    try {
      const result = await captureFromCamera(videoRef.current);
      setCapturedPng(result.base64);
      stopCamera();
      setCameraState('captured');
    } catch (e: any) {
      setError('Capture failed. Try again.');
    }
  };

  const handleRetake = () => {
    setCapturedPng(null);
    setError(null);
    setCameraState('starting');
    startCamera();
  };

  const handleAnalyzeCamera = async () => {
    if (!capturedPng) return;
    setCameraState('analyzing');
    setError(null);
    try {
      if (onImageCaptured) {
        onImageCaptured(capturedPng);
        onClose();
        return;
      }
      const result = await analyzeDocumentImage(capturedPng);
      onScanComplete(result);
      onClose();
    } catch {
      setError('Analysis failed. Try again.');
      setCameraState('captured');
    }
  };

  // ── Flatbed / network scan ────────────────────────────────────────────────
  const handleScan = async () => {
    if (!selectedScanner?.available) return;
    setScannerState('scanning');
    setError(null);
    try {
      const result = await scan(
        {
          scannerIp: selectedScanner.ip,
          twainSource: selectedScanner.twainName,
          resolution: 300,
          colorMode: 'color',
        },
        (msg) => setStatusMsg(msg)
      );
      // For scanner output, analyze the image
      setScannerState('done');
      setStatusMsg('Analyzing…');
      try {
        const text = await analyzeDocumentImage(result.base64);
        onScanComplete(text);
      } catch {
        // If analysis fails, still pass the image
        if (onImageCaptured) onImageCaptured(result.base64);
      }
      onClose();
    } catch (e: any) {
      setScannerState('error');
      setError(e.message || 'Scan failed');
      setStatusMsg('');
    }
  };

  if (!isOpen) return null;

  const gold = '#C4973B';
  const dark = '#13100C';
  const cream = '#FDF6EC';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(19,16,12,0.92)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 480, borderRadius: 32,
        background: '#1A1208', border: `1px solid ${gold}25`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: '92vh', boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid rgba(196,151,59,0.1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, color: cream }}>
            Add a photo or document
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
            fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid rgba(196,151,59,0.1)` }}>
          {(['camera', 'scanner'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '14px 0', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === t ? 700 : 400, fontFamily: 'system-ui',
              color: tab === t ? gold : 'rgba(255,255,255,0.3)',
              borderBottom: tab === t ? `2px solid ${gold}` : '2px solid transparent',
              transition: 'all 0.2s', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {t === 'camera' ? '📷  Camera' : '🖨️  Scanner'}
            </button>
          ))}
        </div>

        {/* Camera tab */}
        {tab === 'camera' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Viewfinder / preview */}
            <div style={{
              position: 'relative', background: '#000',
              minHeight: 280, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cameraState === 'denied' ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
                  <div style={{ fontSize: 16, marginBottom: 8, color: cream }}>Camera permission denied</div>
                  <div style={{ fontSize: 13 }}>Use the Scanner tab, or allow camera in your browser settings</div>
                </div>
              ) : capturedPng ? (
                <img
                  src={`data:image/png;base64,${capturedPng}`}
                  alt="Captured"
                  style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }}
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ width: '100%', maxHeight: 320, objectFit: 'cover', opacity: cameraState === 'ready' ? 1 : 0.3 }}
                  />
                  {/* Corner guides */}
                  {cameraState === 'ready' && (
                    <div style={{ position: 'absolute', inset: 20, pointerEvents: 'none' }}>
                      {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
                        <div key={i} style={{
                          position: 'absolute', width: 24, height: 24,
                          borderTop: i < 2 ? `2px solid ${gold}` : 'none',
                          borderBottom: i >= 2 ? `2px solid ${gold}` : 'none',
                          borderLeft: i % 2 === 0 ? `2px solid ${gold}` : 'none',
                          borderRight: i % 2 === 1 ? `2px solid ${gold}` : 'none',
                          ...pos, opacity: 0.6,
                        }} />
                      ))}
                      <div style={{
                        position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
                        fontSize: 11, color: `${gold}80`, fontFamily: 'system-ui', letterSpacing: '0.15em',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>Position photo here</div>
                    </div>
                  )}
                  {cameraState === 'starting' && (
                    <div style={{ position: 'absolute', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                      Starting camera…
                    </div>
                  )}
                </>
              )}

              {/* Analyzing overlay */}
              {cameraState === 'analyzing' && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(19,16,12,0.8)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 16, backdropFilter: 'blur(4px)',
                }}>
                  <div style={{ fontSize: 36, animation: 'spin 1.5s linear infinite' }}>✨</div>
                  <div style={{ color: gold, fontFamily: 'Georgia,serif', fontSize: 16 }}>
                    Interpreting history…
                  </div>
                </div>
              )}
            </div>

            {/* Camera controls */}
            <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {error && (
                <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>{error}</div>
              )}

              {!capturedPng && cameraState !== 'denied' ? (
                <button
                  onClick={handleCapture}
                  disabled={cameraState !== 'ready'}
                  style={{
                    ...BIG_BTN,
                    background: cameraState === 'ready' ? gold : 'rgba(196,151,59,0.2)',
                    color: cameraState === 'ready' ? dark : `${gold}50`,
                  }}
                >
                  <span style={{ fontSize: 28 }}>📷</span>
                  Take Photo
                </button>
              ) : capturedPng ? (
                <>
                  <button onClick={handleAnalyzeCamera} disabled={cameraState === 'analyzing'} style={{
                    ...BIG_BTN, background: gold, color: dark,
                  }}>
                    <span style={{ fontSize: 24 }}>✨</span>
                    Use This Photo
                  </button>
                  <button onClick={handleRetake} disabled={cameraState === 'analyzing'} style={{
                    ...BIG_BTN, background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.5)', fontSize: 15,
                  }}>
                    Retake
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Scanner tab */}
        {tab === 'scanner' && (
          <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {scannerState === 'discovering' && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
                <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⟳</div>
                <div style={{ fontSize: 15 }}>Looking for scanners…</div>
              </div>
            )}

            {scannerState !== 'discovering' && scanners.filter(s => s.available).length === 0 && (
              <div style={{
                borderRadius: 16, padding: 24, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🖨️</div>
                <div style={{ fontSize: 16, color: cream, marginBottom: 8 }}>No scanner found</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  Make sure <strong style={{ color: `${gold}80` }}>flowhub_bridge.py</strong> is running
                  on your computer, then try again.
                </div>
                <button onClick={() => {
                  setScannerState('discovering');
                  getAvailableScanners().then(found => {
                    setScanners(found);
                    const avail = found.filter(s => s.available);
                    setSelectedScanner(avail[0] || null);
                    setScannerState(avail.length > 0 ? 'ready' : 'error');
                  });
                }} style={{
                  marginTop: 20, padding: '12px 28px', borderRadius: 24,
                  background: 'rgba(196,151,59,0.1)', border: `1px solid ${gold}40`,
                  color: gold, fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui',
                }}>
                  Try Again
                </button>
              </div>
            )}

            {scanners.filter(s => s.available).length > 0 && (
              <>
                {/* Scanner list */}
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'system-ui', fontWeight: 700,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
                    Available scanners
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scanners.filter(s => s.available).map(s => (
                      <button key={s.id} onClick={() => setSelectedScanner(s)} style={{
                        padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'system-ui', fontSize: 15,
                        background: selectedScanner?.id === s.id
                          ? `rgba(196,151,59,0.12)` : 'rgba(255,255,255,0.04)',
                        border: selectedScanner?.id === s.id
                          ? `1px solid ${gold}50` : '1px solid rgba(255,255,255,0.07)',
                        color: selectedScanner?.id === s.id ? cream : 'rgba(255,255,255,0.5)',
                        transition: 'all 0.15s',
                      }}>
                        <span style={{ marginRight: 10 }}>
                          {s.protocol === 'twain' ? '🔌' : '📡'}
                        </span>
                        {s.name}
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                          color: s.protocol === 'twain' ? 'rgba(96,165,250,0.6)' : 'rgba(74,222,128,0.6)',
                        }}>
                          {s.protocol}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                {statusMsg && (
                  <div style={{ fontSize: 13, color: gold, textAlign: 'center', fontStyle: 'italic' }}>
                    {statusMsg}
                  </div>
                )}
                {error && (
                  <div style={{ fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</div>
                )}

                {/* Scan button */}
                <button
                  onClick={handleScan}
                  disabled={!selectedScanner || scannerState === 'scanning' || scannerState === 'done'}
                  style={{
                    ...BIG_BTN,
                    background: scannerState === 'scanning' ? 'rgba(196,151,59,0.2)'
                      : scannerState === 'done' ? 'rgba(74,222,128,0.15)'
                      : gold,
                    color: scannerState === 'scanning' ? `${gold}60`
                      : scannerState === 'done' ? 'rgba(74,222,128,0.9)'
                      : dark,
                    marginTop: 4,
                  }}
                >
                  {scannerState === 'scanning' ? (
                    <>
                      <span style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>⟳</span>
                      {statusMsg || 'Scanning…'}
                    </>
                  ) : scannerState === 'done' ? (
                    <><span>✓</span> Done</>
                  ) : (
                    <><span style={{ fontSize: 24 }}>🖨️</span> Scan Now</>
                  )}
                </button>
              </>
            )}

            {/* Bridge setup hint */}
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center',
              fontFamily: 'system-ui', lineHeight: 1.6, paddingTop: 4,
            }}>
              Need help? Run <code style={{ color: `${gold}60` }}>python flowhub_bridge.py</code> on your PC
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DocumentScannerModal;
