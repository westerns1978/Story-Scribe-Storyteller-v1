import React, { useState } from 'react';

export interface TimelineEvent {
    year: string;
    title: string;
    elementId: string;
}

interface TimelineProps {
    events: TimelineEvent[];
    onEventClick: (elementId: string) => void;
}

/**
 * Enhanced Timeline component with interactive nodes, hover tooltips,
 * and clickable events for narrative navigation.
 */
const Timeline: React.FC<TimelineProps> = ({ events, onEventClick }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    if (!events || events.length === 0) {
        return null;
    }

    // Sort events chronologically if years are numbers
    const sortedEvents = [...events].sort((a, b) => {
        const yearA = parseInt(a.year, 10);
        const yearB = parseInt(b.year, 10);
        if (!isNaN(yearA) && !isNaN(yearB)) {
            return yearA - yearB;
        }
        return (a.year || '').localeCompare(b.year || '');
    });

    return (
        <div className="w-full overflow-x-auto py-12 px-10 bg-gemynd-mahogany/5 dark:bg-white/[0.02] rounded-[3rem] border border-gemynd-ink/5 dark:border-white/5 shadow-inner backdrop-blur-sm scrollbar-hide">
            <style>{`
                @keyframes tooltip-pop {
                    0% { transform: translateY(10px) scale(0.9); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                .animate-tooltip {
                    animation: tooltip-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            
            <div className="relative inline-flex items-center min-w-full" style={{ height: '140px' }}>
                {/* Cinematic Connecting Rail */}
                <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gemynd-oxblood/30 dark:via-gemynd-agedGold/20 to-transparent -translate-y-1/2 rounded-full"></div>
                
                <div className="flex space-x-36 px-16">
                    {sortedEvents.map((event, index) => {
                        const isHovered = hoveredId === event.elementId;
                        
                        return (
                            <div 
                                key={index} 
                                className="relative flex flex-col items-center group cursor-pointer z-10"
                                onMouseEnter={() => setHoveredId(event.elementId)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => onEventClick(event.elementId)}
                            >
                                {/* Event Node with glow/scaling logic */}
                                <div className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full transition-all duration-500 ease-out border-[3px] 
                                    ${isHovered 
                                        ? 'bg-gemynd-agedGold border-white scale-[1.75] shadow-[0_0_25px_#D4AF37] z-30' 
                                        : 'bg-gemynd-mahogany dark:bg-gemynd-linen border-gemynd-oxblood dark:border-gemynd-agedGold scale-100 shadow-md z-10'}`}
                                >
                                    {isHovered && (
                                        <div className="absolute inset-0 rounded-full animate-ping bg-gemynd-agedGold/60"></div>
                                    )}
                                </div>
                                
                                {/* Timeline Label (Year/Title) */}
                                <div className={`flex flex-col items-center text-center transition-all duration-500 ${index % 2 === 0 ? 'mb-24' : 'mt-24'} ${isHovered ? 'scale-110 opacity-100' : 'opacity-40'}`}>
                                    <span className="text-[11px] font-mono font-black text-gemynd-oxblood dark:text-gemynd-agedGold uppercase tracking-[0.2em] mb-1">{event.year}</span>
                                    <span className="text-[12px] font-display font-black text-gemynd-ink dark:text-white w-48 truncate">{event.title}</span>
                                </div>

                                {/* Rich Tooltip on Hover */}
                                {isHovered && (
                                    <div className={`absolute z-[100] w-64 p-5 glass-tier-1 bg-gemynd-mahogany dark:bg-gemynd-linen rounded-3xl shadow-2xl animate-tooltip pointer-events-none border border-white/20 dark:border-gemynd-ink/10
                                        ${index % 2 === 0 ? 'bottom-full mb-12' : 'top-full mt-12'}`}
                                    >
                                        <div className="text-center relative">
                                            <span className="text-[10px] font-black text-gemynd-agedGold dark:text-gemynd-oxblood uppercase tracking-[0.4em] mb-2 block">Archive Node</span>
                                            <h4 className="text-base font-display font-black text-white dark:text-gemynd-ink leading-tight mb-2">{event.title}</h4>
                                            <div className="w-10 h-0.5 bg-gemynd-oxblood dark:bg-gemynd-agedGold mx-auto mt-3 opacity-30" />
                                            <p className="text-[10px] text-white/40 dark:text-gemynd-ink/40 mt-3 uppercase tracking-widest font-bold">Tap to Jump to Chapter</p>
                                        </div>
                                        {/* Tooltip Arrow */}
                                        <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-gemynd-mahogany dark:bg-gemynd-linen border border-white/20 dark:border-gemynd-ink/10 
                                            ${index % 2 === 0 ? '-bottom-2 border-t-0 border-l-0' : '-top-2 border-b-0 border-r-0'}`} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Visual Instruction */}
            <div className="mt-12 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="flex items-center gap-3 px-6 py-2 bg-gemynd-oxblood/5 dark:bg-white/5 rounded-full border border-gemynd-oxblood/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-gemynd-oxblood dark:bg-gemynd-agedGold animate-pulse"></span>
                    <p className="text-[9px] font-black text-gemynd-ink/30 dark:text-white/30 uppercase tracking-[0.3em]">Scrub timeline to navigate the neural narrative</p>
                </div>
            </div>
        </div>
    );
};

export default Timeline;