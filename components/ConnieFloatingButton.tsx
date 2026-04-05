
import React, { useState } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useConnieActions } from '../hooks/useConnieActions';
import MicrophoneIcon from './icons/MicrophoneIcon';
import XMarkIcon from './icons/XMarkIcon';
import CameraIcon from './icons/CameraIcon';
import Loader2Icon from './icons/Loader2Icon';

export const ConnieFloatingButton: React.FC<{ 
    onNavigate: (dest: string) => void;
    onPhotoCaptured: (base64: string) => void;
    onCreateStory: (subject?: string) => void;
}> = ({ onNavigate, onPhotoCaptured, onCreateStory }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { 
        connect, disconnect, isListening, isVideoActive, messages, 
        startVideo, stopVideo, videoRef, canvasRef 
    } = useGeminiLive({ language: 'English' });

    useConnieActions({
        onNavigate,
        onCapturePhoto: async () => {
            if (canvasRef.current && videoRef.current) {
                const canvas = canvasRef.current;
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
                onPhotoCaptured(base64);
            }
        },
        onCreateStory
    });

    const toggleSession = () => {
        if (isListening) {
            disconnect();
            setIsExpanded(false);
        } else {
            connect();
            setIsExpanded(true);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[600] flex flex-col items-end gap-4 pointer-events-none">
            {isExpanded && (
                <div className="w-80 bg-white dark:bg-[#1A1715] rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden flex flex-col pointer-events-auto animate-slide-up">
                    <header className="p-5 border-b border-white/5 flex justify-between items-center bg-gemynd-oxblood text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                                <img src="https://storage.googleapis.com/westerns1978-digital-assets/Websites/wissums/connie-ai.png" alt="Connie" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-sm">Connie AI</span>
                        </div>
                        <button onClick={() => setIsExpanded(false)} className="p-1 hover:bg-white/10 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
                    </header>

                    <div className="flex-1 max-h-96 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20">
                        {isVideoActive && (
                            <div className="rounded-2xl overflow-hidden aspect-video bg-black relative border border-white/10">
                                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[8px] font-bold uppercase rounded-full animate-pulse">Live Vision</div>
                            </div>
                        )}
                        
                        <div className="space-y-3">
                            {messages.slice(-4).map((m, i) => (
                                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-xs ${m.role === 'user' ? 'bg-gemynd-oxblood text-white rounded-br-none' : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/5 rounded-bl-none shadow-sm'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <footer className="p-4 bg-white dark:bg-[#1A1715] border-t border-white/5 flex items-center justify-center gap-4">
                        <button 
                            onClick={isVideoActive ? stopVideo : startVideo}
                            className={`p-4 rounded-full transition-all ${isVideoActive ? 'bg-amber-500 text-black' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
                        >
                            <CameraIcon className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={toggleSession}
                            className={`p-6 rounded-full transition-all shadow-xl ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-gemynd-oxblood text-white'}`}
                        >
                            <MicrophoneIcon className="w-8 h-8" />
                        </button>
                    </footer>
                </div>
            )}

            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-16 h-16 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-90 pointer-events-auto border-4 border-white dark:border-black/20 flex items-center justify-center relative overflow-hidden ${isListening ? 'ring-4 ring-gemynd-oxblood ring-offset-4 dark:ring-offset-black' : ''}`}
            >
                {isListening ? (
                    <div className="absolute inset-0 bg-gemynd-oxblood flex items-center justify-center">
                        <Loader2Icon className="w-8 h-8 text-white" />
                    </div>
                ) : (
                    <img src="https://storage.googleapis.com/westerns1978-digital-assets/Websites/wissums/connie-ai.png" alt="Connie" className="w-full h-full object-cover" />
                )}
            </button>
        </div>
    );
};
