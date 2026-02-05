import React, { useRef, useState, useEffect } from 'react';
import XMarkIcon from './icons/XMarkIcon';
import CameraIcon from './icons/CameraIcon';
import SparklesIcon from './icons/SparklesIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { analyzeDocumentImage, reimaginePhoto } from '../services/api';

interface MemoryCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCaptureComplete: (result: { type: 'text' | 'photo', data: any }) => void;
}

type CaptureMode = 'document' | 'photo';

const MemoryCaptureModal: React.FC<MemoryCaptureModalProps> = ({ isOpen, onClose, onCaptureComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<CaptureMode>('photo');
    const [error, setError] = useState<string | null>(null);
    
    // Result preview
    const [result, setResult] = useState<any>(null);

    // Define functions BEFORE useEffect to avoid hoisting issues
    const resetState = () => {
        setCapturedImage(null);
        setResult(null);
        setIsProcessing(false);
        setError(null);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
            }
        } catch (err) {
            setError("Camera access denied. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsStreaming(false);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                setCapturedImage(dataUrl);
                stopCamera();
                processCapture(dataUrl);
            }
        }
    };

    const processCapture = async (dataUrl: string) => {
        setIsProcessing(true);
        const base64 = dataUrl.split(',')[1];

        try {
            if (mode === 'document') {
                const text = await analyzeDocumentImage(base64);
                onCaptureComplete({ type: 'text', data: text });
                onClose();
            } else {
                // Photo Mode: Re-imagine
                const enhancedResult = await reimaginePhoto(base64);
                setResult(enhancedResult);
            }
        } catch (e) {
            console.error(e);
            setError("Processing failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSavePhoto = () => {
        if (result) {
            onCaptureComplete({ type: 'photo', data: result });
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
            resetState();
        }
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                        <button 
                            onClick={() => { setMode('photo'); resetState(); startCamera(); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${mode === 'photo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <CameraIcon className="w-4 h-4" /> Photo Enhance
                        </button>
                        <button 
                            onClick={() => { setMode('document'); resetState(); startCamera(); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors ${mode === 'document' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <DocumentTextIcon className="w-4 h-4" /> Scan Text
                        </button>
                    </div>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-slate-400" /></button>
                </div>

                {/* Main Viewport */}
                <main className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-[400px]">
                    {isProcessing ? (
                         <div className="text-center p-6 animate-pulse">
                            <SparklesIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-white text-lg font-bold">Processing with Gemini...</h3>
                            <p className="text-blue-300 text-sm mt-2">
                                {mode === 'photo' ? "Analyzing lighting, enhancing details (Canon R5 Style)..." : "Transcribing text..."}
                            </p>
                        </div>
                    ) : result ? (
                        <div className="relative w-full h-full">
                            {/* Comparison View */}
                            <div className="grid grid-cols-2 h-full">
                                <div className="relative border-r border-white/20">
                                    <img src={result.original} className="w-full h-full object-cover" alt="Original" />
                                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">Original</span>
                                </div>
                                <div className="relative">
                                    <img src={result.enhanced} className="w-full h-full object-cover" alt="Enhanced" />
                                    <span className="absolute bottom-2 right-2 bg-blue-600/80 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1">
                                        <SparklesIcon className="w-3 h-3"/> Enhanced
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : capturedImage ? (
                         <img src={capturedImage} className="w-full h-full object-contain opacity-50" alt="Preview" />
                    ) : (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    )}
                    
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
                            <p className="text-red-400 text-center">{error}</p>
                        </div>
                    )}
                </main>

                {/* Footer Controls */}
                <footer className="p-6 bg-slate-800 border-t border-slate-700 flex justify-center gap-4">
                    {!result && !isProcessing && (
                         <button 
                            onClick={handleCapture}
                            className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 shadow-lg transition-transform active:scale-95"
                            aria-label="Capture"
                        >
                            <div className="w-full h-full rounded-full bg-white transform scale-75"></div>
                        </button>
                    )}
                    
                    {result && (
                        <div className="flex gap-3 w-full">
                            <button onClick={() => { resetState(); startCamera(); }} className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600">Retake</button>
                            <button onClick={handleSavePhoto} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 shadow-lg shadow-blue-900/20">
                                Save to Story
                            </button>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default MemoryCaptureModal;