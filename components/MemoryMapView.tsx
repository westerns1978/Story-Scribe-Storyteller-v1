import React, { useMemo } from 'react';
import { StoryArchiveItem } from '../types';
import MapPinIcon from './icons/MapPinIcon';
import GlobeAmericasIcon from './icons/GlobeAmericasIcon';
import SparklesIcon from './icons/SparklesIcon';

const MemoryMapView: React.FC<{ story: StoryArchiveItem | null }> = ({ story }) => {
    // SAFE DATA ACCESS WITH NULL GUARDS
    const locations = useMemo(() => {
        if (!story) return [];
        return story.extraction?.locations || [];
    }, [story]);
    
    const timeline = useMemo(() => {
        if (!story) return [];
        const events = story.extraction?.timeline || [];
        return [...events].sort((a, b) => {
            const yearA = parseInt(String(a.year), 10);
            const yearB = parseInt(String(b.year), 10);
            if (!isNaN(yearA) && !isNaN(yearB)) return yearA - yearB;
            return String(a.year || '').localeCompare(String(b.year || ''));
        });
    }, [story]);

    if (!story) return null;

    return (
        <div className="h-full w-full bg-[#0a0909] p-10 lg:p-20 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-20">
                <header className="text-center">
                    <span className="text-gemynd-red font-bold tracking-[0.4em] uppercase text-[10px] mb-4 block">Spatial Intelligence Node</span>
                    <h2 className="text-5xl font-display font-black text-white tracking-tighter mb-4">The Global Footprint</h2>
                    <div className="w-24 h-1 bg-gemynd-red mx-auto opacity-30 rounded-full" />
                </header>

                <div className="relative h-[500px] bg-white/[0.02] rounded-[4rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-12 text-center group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,45,45,0.05)_0%,_transparent_70%)] animate-breathe" />
                    
                    <GlobeAmericasIcon className="w-48 h-48 text-white/5 group-hover:text-gemynd-red/10 transition-all duration-[3s] group-hover:scale-110" />
                    
                    <div className="relative z-10 space-y-10 w-full">
                        <div className="flex flex-wrap justify-center gap-6">
                            {locations.length > 0 ? locations.map((loc, i) => (
                                <div key={i} className="px-8 py-4 bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 flex items-center gap-4 animate-float hover:border-gemynd-red/50 transition-all cursor-crosshair" style={{animationDelay: `${i * 0.8}s`}}>
                                    <div className="w-10 h-10 bg-gemynd-red/20 rounded-full flex items-center justify-center text-gemynd-red">
                                        <MapPinIcon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-lg font-display font-bold text-white leading-none tracking-tight">{loc?.name || ''}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-bold">{loc?.type || ''}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-slate-600 font-serif italic text-xl opacity-50">Spatial coordinates awaiting extraction node...</p>
                            )}
                        </div>
                    </div>

                    {/* Interactive Timeline Rail */}
                    <div className="absolute bottom-16 left-20 right-20">
                        <div className="relative h-1 bg-white/5 rounded-full">
                            <div className="absolute inset-0 flex justify-between px-1">
                                {timeline.map((event, i) => (
                                    <div 
                                        key={i}
                                        className="group/pin relative"
                                        title={`${event?.year || ''}: ${event?.event || ''}`}
                                    >
                                        <div className="w-3 h-3 bg-gemynd-red rounded-full -translate-y-1 transform border-2 border-[#0a0909] group-hover/pin:scale-150 transition-transform cursor-pointer" />
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap bg-black border border-white/10 p-2 rounded-lg text-[10px] font-bold text-white pointer-events-none">
                                            {event?.year || ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {timeline.map((event, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-[3rem] hover:border-gemynd-red/20 transition-all group hover:bg-white/[0.08] flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-gemynd-red font-mono font-black text-2xl tracking-tighter">{event?.year || ''}</span>
                                <div className="w-2 h-2 rounded-full bg-gemynd-red opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                            </div>
                            <h4 className="text-white font-display font-bold text-2xl tracking-tight mb-4">{event?.event || ''}</h4>
                            <p className="text-slate-400 text-lg leading-relaxed font-serif italic opacity-80 mb-4">
                                "{event?.significance || ''}"
                            </p>
                            
                            {event?.details && (
                                <div className="mb-6 p-4 bg-white/5 rounded-2xl flex gap-3 items-center">
                                    <SparklesIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <p className="text-sm text-amber-100/60 font-serif italic leading-relaxed">
                                        {event.details}
                                    </p>
                                </div>
                            )}

                            {event?.historical_context && (
                                <div className="mt-auto pt-6 border-t border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <GlobeAmericasIcon className="w-3 h-3 text-gemynd-red/60" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Historical Anchor</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                        {event.historical_context}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MemoryMapView;