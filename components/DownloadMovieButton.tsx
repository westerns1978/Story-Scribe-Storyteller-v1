// components/DownloadMovieButton.tsx
// ============================================
// Records the CinematicReveal as it plays and saves as WebM video.
// Uses MediaRecorder API to capture the canvas/DOM as a video stream.
// User clicks "Download Movie" → reveal auto-plays → records → downloads.
// ============================================

import React, { useState, useRef, useCallback } from 'react';

interface DownloadMovieButtonProps {
  onStartRecording: () => void;   // trigger CinematicReveal to play from beginning
  onStopRecording?: () => void;
  storytellerName: string;
  estimatedDuration?: number;     // ms — how long the reveal takes
}

type RecordState = 'idle' | 'preparing' | 'recording' | 'processing' | 'done' | 'error';

export const DownloadMovieButton: React.FC<DownloadMovieButtonProps> = ({
  onStartRecording,
  storytellerName,
  estimatedDuration = 90000, // 90 seconds default
}) => {
  const [state, setState] = useState<RecordState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRecord = useCallback(async () => {
    if (state !== 'idle') return;

    setState('preparing');
    setError('');
    chunksRef.current = [];

    try {
      // Capture the entire page as a video stream
      // @ts-ignore — captureStream is not in all TS defs but supported in Chrome/Edge
      const stream = await (document.body as any).parentElement.captureStream?.(30)
        ?? await (document.querySelector('canvas') as any)?.captureStream?.(30);

      if (!stream) {
        // Fallback: use screen capture
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true,
        });
        startRecording(screenStream, estimatedDuration);
        return;
      }

      startRecording(stream, estimatedDuration);
    } catch (e: any) {
      // If captureStream fails, fall back to screen capture
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true,
        });
        startRecording(screenStream, estimatedDuration);
      } catch (e2: any) {
        setState('error');
        setError('Screen recording not available in this browser. Try Chrome or Edge.');
      }
    }
  }, [state, estimatedDuration]);

  const startRecording = useCallback((stream: MediaStream, duration: number) => {
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      setState('processing');
      if (timerRef.current) clearInterval(timerRef.current);

      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = storytellerName.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${safeName}_Story_Scribe.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Stop all tracks
      stream.getTracks().forEach(t => t.stop());
      setState('done');
      setTimeout(() => setState('idle'), 4000);
    };

    recorder.start(1000); // collect in 1s chunks
    setState('recording');
    setProgress(0);

    // Trigger the reveal to play
    onStartRecording();

    // Progress timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
    }, 500);

    // Auto-stop when duration reached
    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, duration + 2000); // +2s buffer
  }, [storytellerName, onStartRecording]);

  const handleStop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const GOLD = '#C4973B';
  const DIM = 'rgba(245,236,215,0.4)';

  const buttonLabel = () => {
    switch (state) {
      case 'idle': return '⬇ Download Movie';
      case 'preparing': return 'Preparing…';
      case 'recording': return `Recording ${progress}% — Click to stop`;
      case 'processing': return 'Saving file…';
      case 'done': return '✓ Downloaded!';
      case 'error': return '⚠ Error';
    }
  };

  const buttonColor = () => {
    switch (state) {
      case 'recording': return 'rgba(248,113,113,0.15)';
      case 'done': return 'rgba(74,222,128,0.1)';
      case 'error': return 'rgba(248,113,113,0.1)';
      default: return 'rgba(196,151,59,0.08)';
    }
  };

  const borderColor = () => {
    switch (state) {
      case 'recording': return 'rgba(248,113,113,0.4)';
      case 'done': return 'rgba(74,222,128,0.3)';
      case 'error': return 'rgba(248,113,113,0.3)';
      default: return 'rgba(196,151,59,0.25)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button
        onClick={state === 'recording' ? handleStop : handleRecord}
        disabled={state === 'preparing' || state === 'processing' || state === 'done'}
        style={{
          padding: '14px 28px',
          background: buttonColor(),
          border: `1px solid ${borderColor()}`,
          borderRadius: 100,
          color: state === 'done' ? '#4ade80' : state === 'error' ? '#f87171' : GOLD,
          fontSize: 11, fontWeight: 900,
          letterSpacing: '.2em', textTransform: 'uppercase',
          cursor: state === 'preparing' || state === 'processing' || state === 'done'
            ? 'default' : 'pointer',
          fontFamily: 'system-ui',
          transition: 'all .2s',
          whiteSpace: 'nowrap',
        }}
      >
        {buttonLabel()}
      </button>

      {state === 'recording' && (
        <div style={{ width: 200, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'rgba(248,113,113,0.6)',
            width: `${progress}%`,
            transition: 'width .5s ease',
          }} />
        </div>
      )}

      {state === 'error' && (
        <p style={{
          fontSize: 10, color: '#f87171',
          fontFamily: 'system-ui', textAlign: 'center',
          maxWidth: 240, lineHeight: 1.4,
        }}>
          {error}
        </p>
      )}

      {state === 'idle' && (
        <p style={{
          fontSize: 9, color: DIM,
          fontFamily: 'system-ui', textAlign: 'center',
          letterSpacing: '.15em', textTransform: 'uppercase',
        }}>
          Records cinematic story as WebM video
        </p>
      )}
    </div>
  );
};

export default DownloadMovieButton;
