
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Circle, Pause, Image as ImageIcon, Maximize2, Minimize2 } from 'lucide-react';

interface VisualAuditPanelProps {
  agentName: string;
  onCaptureStill: (base64: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const VisualAuditPanel: React.FC<VisualAuditPanelProps> = ({ 
  agentName, 
  onCaptureStill, 
  isOpen, 
  onClose 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState<'LINK_ACTIVE' | 'RECORDING' | 'ANALYZING'>('LINK_ACTIVE');

  useEffect(() => {
    if (isOpen && !isMinimized) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, isMinimized]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureStill = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
        setStatus('ANALYZING');
        onCaptureStill(base64);
        setTimeout(() => setStatus(isRecording ? 'RECORDING' : 'LINK_ACTIVE'), 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed bottom-24 right-6 z-[110] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
        isMinimized ? 'w-48 h-12' : 'w-80 h-[380px]'
      }`}
    >
      {/* Header */}
      <div className="bg-slate-800 p-3 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded tracking-tighter">
            VISUAL AUDIT
          </span>
          <span className="text-xs font-bold text-white truncate">{agentName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400">
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Video Feed */}
          <div className="relative aspect-video bg-black group">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-cover ${isRecording ? 'border-2 border-red-500' : ''}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Status Overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md rounded-full">
              <div className={`w-2 h-2 rounded-full ${status === 'RECORDING' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-[9px] font-mono text-white tracking-widest">{status}</span>
            </div>

            {/* Document Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
               <div className="w-4/5 h-4/5 border border-dashed border-white/50 rounded-lg" />
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 flex justify-between items-center bg-slate-900">
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setIsRecording(!isRecording);
                  setStatus(!isRecording ? 'RECORDING' : 'LINK_ACTIVE');
                }} 
                className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                <Circle size={18} fill={isRecording ? 'white' : 'none'} />
              </button>
              <button 
                onClick={() => setIsPaused(!isPaused)} 
                disabled={!isRecording}
                className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
              >
                <Pause size={18} />
              </button>
            </div>
            
            <button 
              onClick={captureStill}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition-all transform active:scale-95 shadow-lg shadow-amber-900/20"
            >
              <ImageIcon size={16} />
              CAPTURE STILL
            </button>
          </div>
          
          <div className="px-4 pb-3">
             <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest leading-none">
               Streaming secured via Wissums Uplink
             </p>
          </div>
        </>
      )}
    </div>
  );
};
