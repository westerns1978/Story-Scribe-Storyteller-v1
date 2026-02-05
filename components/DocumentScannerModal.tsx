
import React, { useRef, useState, useEffect } from 'react';
import XMarkIcon from './icons/XMarkIcon';
import CameraIcon from './icons/CameraIcon';
import SparklesIcon from './icons/SparklesIcon';
import { analyzeDocumentImage } from '../services/api';

interface DocumentScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanComplete: (text: string) => void;
}

const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({ isOpen, onClose, onScanComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
            setCapturedImage(null);
            setError(null);
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
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
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(dataUrl);
                stopCamera();
            }
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setError(null);
        startCamera();
    };

    const handleAnalyze = async () => {
        if (!capturedImage) return;
        
        setIsAnalyzing(true);
        setError(null);
        
        try {
            const base64Data = capturedImage.split(',')[1];
            const result = await analyzeDocumentImage(base64Data);
            onScanComplete(result);
            onClose();
        } catch (err) {
            setError("Vision AI Uplink Failed. Try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gemynd-deep-brown/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
            <div className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-gemynd-soft-peach flex flex-col max-h-[90vh]">
                <header className="flex justify-between items-center p-6 border-b border-gemynd-soft-peach">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-warm">
                            <CameraIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gemynd-deep-brown">Artifact Scanner</h2>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Gemini 2.0 Flash Active</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-gemynd-terracotta transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden min-h-[400px]">
                    {!capturedImage ? (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover opacity-80"
                            />
                            {/* Scanning Guide UI */}
                            <div className="absolute inset-10 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none flex flex-col items-center justify-center">
                                <div className="w-full h-0.5 bg-amber-500/40 absolute top-1/2 left-0 animate-scan"></div>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-32">Position Document Here</p>
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                            <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain shadow-2xl" />
                            {isAnalyzing && (
                                <div className="absolute inset-0 bg-gemynd-deep-brown/60 backdrop-blur-md flex flex-col items-center justify-center text-white gap-4 p-8 text-center animate-fade-in">
                                    <SparklesIcon className="w-12 h-12 text-amber-400 animate-spin" />
                                    <h3 className="text-xl font-display font-bold">Interpreting History...</h3>
                                    <p className="text-sm text-amber-200/80 max-w-xs italic">Analyzing textures, identifying faces, and transcribing handwritten notes.</p>
                                </div>
                            )}
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </main>

                <footer className="p-8 bg-white border-t border-gemynd-soft-peach flex justify-center gap-4">
                    {!capturedImage ? (
                        <button 
                            onClick={handleCapture}
                            disabled={!isStreaming}
                            className="w-20 h-20 rounded-full border-[6px] border-gemynd-cream bg-amber-500 hover:bg-amber-600 shadow-warm-lg transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center group"
                            aria-label="Capture photo"
                        >
                            <div className="w-4 h-4 bg-white rounded-full group-hover:scale-125 transition-transform"></div>
                        </button>
                    ) : (
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={handleRetake}
                                disabled={isAnalyzing}
                                className="flex-1 py-4 rounded-2xl bg-gemynd-cream text-gemynd-terracotta font-bold hover:bg-gemynd-soft-peach/20 transition-colors disabled:opacity-50 uppercase tracking-widest text-xs"
                            >
                                Retake
                            </button>
                            <button 
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="flex-1 py-4 rounded-2xl bg-gemynd-terracotta text-white font-bold hover:bg-gemynd-sienna transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-warm uppercase tracking-widest text-xs"
                            >
                                {isAnalyzing ? 'Uplinking...' : 'Interpret DNA'}
                            </button>
                        </div>
                    )}
                </footer>
            </div>
            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan {
                    position: absolute;
                    width: 100%;
                    animation: scan 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default DocumentScannerModal;
