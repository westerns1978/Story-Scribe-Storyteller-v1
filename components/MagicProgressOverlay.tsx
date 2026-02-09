import React, { useEffect, useState } from 'react';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import ImagePlusIcon from './icons/ImagePlusIcon';
import VideoCameraIcon from './icons/VideoCameraIcon';
import MapIcon from './icons/MapIcon';
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import SparklesIcon from './icons/SparklesIcon';
import { AutomatedProgress } from '../types';

interface MagicProgressOverlayProps {
    progress: AutomatedProgress;
}

const steps = [
    { id: 'agent_scribe', label: "Drafting Manuscript", icon: BrainCircuitIcon },
    { id: 'agent_cartographer', label: 'Mapping History', icon: MapIcon },
    { id: 'agent_illustrator', label: 'Painting Scenes', icon: ImagePlusIcon },
    { id: 'agent_director', label: 'Cinematic Polish', icon: VideoCameraIcon },
    { id: 'complete', label: 'Legacy Materialized', icon: CheckBadgeIcon },
];

const MagicProgressOverlay: React.FC<MagicProgressOverlayProps> = ({ progress }) => {
    const [thought, setThought] = useState("Calibrating Neural Link...");
    
    useEffect(() => {
        if (!progress) return;
        const thoughts = [
            "Weaving memories into narrative nodes...",
            "Consulting historical archives...",
            "Synthesizing visual DNA...",
            "Synchronizing temporal events...",
            "Polishing the master transmission..."
        ];
        const interval = setInterval(() => {
            setThought(thoughts[Math.floor(Math.random() * thoughts.length)]);
        }, 4000);
        return () => clearInterval(interval);
    }, [progress]);

    if (!progress) return null;

    const currentStepIndex = steps.findIndex(step => step.id === progress);
    const isComplete = progress === 'complete';

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#050404]/95 backdrop-blur-3xl overflow-hidden animate-fade-in">
            <style>{`
                @keyframes weave {
                    0% { transform: rotate(0deg) scale(1); opacity: 0.1; }
                    50% { transform: rotate(180deg) scale(1.4); opacity: 0.3; }
                    100% { transform: rotate(360deg) scale(1); opacity: 0.1; }
                }
                .weaver-ring {
                    position: absolute;
                    inset: -40vw;
                    border: 1px solid #962D2D;
                    border-radius: 50%;
                    opacity: 0.1;
                    animation: weave 25s linear infinite;
                }
            `}</style>

            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="weaver-ring" style={{ animationDuration: '35s', borderColor: '#D4AF37' }} />
                <div className="weaver-ring" style={{ animationDuration: '50s', animationDirection: 'reverse', inset: '-50vw' }} />
                <div className="weaver-ring" style={{ animationDuration: '70s', inset: '-60vw', opacity: 0.05, borderColor: '#FFF' }} />
            </div>

            <div className="relative z-10 w-full max-w-xl px-10 flex flex-col items-center">
                <div className="text-center mb-20 space-y-8">
                    <div className="w-36 h-36 bg-black rounded-full flex items-center justify-center mx-auto shadow-2xl relative border border-white/10">
                        <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                        <SparklesIcon className="w-16 h-16 text-amber-500 animate-pulse" />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-6xl font-display font-black text-white tracking-tighter leading-none">
                            {isComplete ? 'Legacy Verified' : 'Neural Weaving'}
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-amber-500/60 animate-pulse">{thought}</p>
                    </div>
                </div>

                <div className="w-full space-y-5">
                    {steps.map((step, idx) => {
                        const active = idx === currentStepIndex;
                        const done = idx < currentStepIndex || isComplete;
                        return (
                            <div key={step.id} className={`flex items-center gap-6 transition-all duration-1000 ${done || active ? 'opacity-100 translate-x-0' : 'opacity-10 translate-x-4'}`}>
                                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 ${active ? 'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-110' : done ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-white/20'}`}>
                                    <step.icon className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${active ? 'text-white' : 'text-white/40'}`}>{step.label}</span>
                                        {active && <span className="text-[8px] font-mono text-amber-500 animate-pulse">UPLINK_ACTIVE</span>}
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                        <div className={`h-full transition-all duration-[3000ms] ease-out ${active ? 'w-[75%] bg-amber-500 shadow-[0_0_10px_#f59e0b]' : done ? 'w-full bg-green-500' : 'w-0'}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MagicProgressOverlay;