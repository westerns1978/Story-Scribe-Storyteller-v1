import React from 'react';

const AudioWaveform: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    return (
        <div className="flex items-center justify-center gap-1 h-12">
            {Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={i}
                    className={`w-1.5 bg-amber-500/80 rounded-full transition-all duration-150 ${
                        isActive ? 'animate-wave' : 'h-1 opacity-30'
                    }`}
                    style={{
                        animationDelay: `${i * 0.05}s`,
                        height: isActive ? `${Math.max(20, Math.random() * 100)}%` : '4px'
                    }}
                />
            ))}
            <style>{`
                @keyframes wave {
                    0%, 100% { height: 20%; opacity: 0.5; }
                    50% { height: 100%; opacity: 1; }
                }
                .animate-wave {
                    animation: wave 1s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default AudioWaveform;