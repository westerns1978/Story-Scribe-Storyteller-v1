import React, { useState, useMemo, useRef } from 'react';
import { StoryExtraction, GeneratedImage } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import StoryImage from './StoryImage';
import SparklesIcon from './icons/SparklesIcon';
import ClockIcon from './icons/ClockIcon';
import ShieldIcon from './icons/ShieldIcon';
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';
import StopIcon from './icons/StopIcon';
import { generateNarration, generateEventNarrationOnDemand } from '../services/api';
import { decode, decodeAudioData } from '../utils/audioUtils';

type TimelineEventType = StoryExtraction['timeline'][0] & { life_chapter?: string, evocative_narration?: string };

interface TimelineVisualizerProps {
  timeline: TimelineEventType[];
  images: GeneratedImage[];
  emotionalArcText?: string;
}

interface EventLayout extends TimelineEventType {
  x: number;
  image: GeneratedImage | null;
  id: string;
}

const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({ timeline, images }) => {
  const [hoveredEvent, setHoveredEvent] = useState<EventLayout | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventLayout | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [localNarration, setLocalNarration] = useState<Record<string, string>>({});
  
  const svgRef = useRef<SVGSVGElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const events = useMemo(() => {
    if (!timeline) return [];
    return [...timeline].sort((a, b) => {
      const yearA = parseInt(String(a.year), 10);
      const yearB = parseInt(String(b.year), 10);
      return (isNaN(yearA) || isNaN(yearB)) ? 0 : yearA - yearB;
    });
  }, [timeline]);

  const { eventsWithLayout, minYear, maxYear } = useMemo(() => {
    if (events.length === 0) return { eventsWithLayout: [], minYear: 0, maxYear: 0 };

    const years = events.map(e => parseInt(String(e.year), 10)).filter(y => !isNaN(y));
    const min = years.length > 0 ? Math.min(...years) : 1900;
    const max = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
    const yearSpan = (max - min) || 50;
    const validImages = (images || []).filter(img => img && img.success && img.image_url);

    const layout = events.map((event, index) => {
      const year = parseInt(String(event.year), 10);
      const yearPosition = isNaN(year) ? (index / events.length) : (year - min) / yearSpan;
      return {
        ...event,
        id: `event-${index}`,
        x: 80 + yearPosition * 840, 
        image: validImages.length > 0 ? validImages[index % validImages.length] : null
      };
    });
    return { eventsWithLayout: layout, minYear: min, maxYear: max };
  }, [events, images]);

  const stopAudio = () => {
    if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
        audioSourceRef.current = null;
    }
    setIsNarrating(false);
  };

  const handleHearMoment = async (event: EventLayout) => {
    if (isNarrating || isSynthesizing) {
        stopAudio();
        return;
    }

    setIsSynthesizing(true);
    try {
        let textToNarrate = event.evocative_narration || localNarration[event.id];
        
        if (!textToNarrate) {
            textToNarrate = await generateEventNarrationOnDemand(event.event, event.significance, event.year);
            setLocalNarration(prev => ({ ...prev, [event.id]: textToNarrate }));
        }

        const base64Audio = await generateNarration(textToNarrate, 'Kore');
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const audioData = decode(base64Audio);
        const buffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsNarrating(false);
        audioSourceRef.current = source;
        source.start(0);
        setIsNarrating(true);
    } catch (err) {
        console.error("Audio node failed", err);
    } finally {
        setIsSynthesizing(false);
    }
  };

  // Issue 2 Fix: Safe guard after ALL hooks
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-tier-1 rounded-[2rem] border border-white/5 text-white/20">
        <ClockIcon className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-serif italic text-lg uppercase tracking-widest">Temporal Nodes Awaiting Extraction</p>
      </div>
    );
  }

  return (
    <div className="relative w-full p-8 lg:p-12 glass-tier-1 rounded-[3.5rem] border border-white/10 shadow-2xl overflow-hidden group/container">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gemynd-oxblood/5 blur-[100px] pointer-events-none rounded-full" />
      
      <header className="flex justify-between items-end mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ClockIcon className="w-5 h-5 text-gemynd-agedGold" />
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Temporal Map</h3>
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-black text-white tracking-tighter leading-none">The Chronology</h2>
        </div>
        <div className="hidden lg:flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Span:</span>
          <span className="text-sm font-mono font-bold text-gemynd-agedGold">{minYear} — {maxYear}</span>
        </div>
      </header>

      <div className="relative min-h-[350px] lg:min-h-[450px]">
        <svg ref={svgRef} viewBox="0 0 1000 350" className="w-full h-full font-sans overflow-visible drop-shadow-2xl">
          <defs>
            <linearGradient id="railGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="50%" stopColor="rgba(150,45,45,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          <path d="M 0 175 Q 500 175, 1000 175" stroke="url(#railGradient)" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M 0 175 Q 500 175, 1000 175" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />

          {eventsWithLayout.map((event, index) => {
            const isHovered = hoveredEvent?.id === event.id;
            return (
              <g
                key={event.id}
                transform={`translate(${event.x}, 175)`}
                onMouseEnter={() => setHoveredEvent(event)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => setSelectedEvent(event)}
                className="cursor-pointer group/node"
              >
                <line 
                  y1="0" 
                  y2={index % 2 === 0 ? -60 : 60} 
                  stroke="white" 
                  strokeWidth={isHovered ? 2 : 1} 
                  strokeDasharray="4 4" 
                  className={`transition-all duration-500 ${isHovered ? 'opacity-60' : 'opacity-10'}`} 
                />
                
                <circle 
                    r={isHovered ? 18 : 12} 
                    fill={isHovered ? "rgba(212,175,55,0.2)" : "rgba(150,45,45,0.15)"} 
                    className="transition-all duration-300 animate-pulse" 
                />
                
                <circle 
                  r={isHovered ? 9 : 6} 
                  fill={isHovered ? "#D4AF37" : "#000"} 
                  stroke={isHovered ? "#FFF" : "#962D2D"} 
                  strokeWidth={isHovered ? 2 : 3} 
                  className="transition-all duration-300 transform" 
                  filter={isHovered ? "url(#glow)" : "none"}
                />

                <text
                  y={index % 2 === 0 ? -85 : 95}
                  textAnchor="middle"
                  fill={isHovered ? "#D4AF37" : "rgba(255,255,255,0.3)"}
                  fontSize={isHovered ? "14" : "12"}
                  fontWeight="900"
                  className="font-mono transition-all duration-300"
                >
                  {event.year}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredEvent && (
          <div 
            className="absolute z-50 pointer-events-none animate-appear"
            style={{ 
                left: `${(hoveredEvent.x / 1000) * 100}%`, 
                top: eventsWithLayout.findIndex(e => e.id === hoveredEvent.id) % 2 === 0 ? '5%' : '55%',
                transform: 'translate(-50%, 0)' 
            }}
          >
            <div className="glass-tier-2 p-6 rounded-3xl border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.5)] w-64 text-center">
                <span className="text-amber-500 font-mono text-[9px] font-bold uppercase tracking-[0.3em] mb-1 block">{hoveredEvent.year} Milestone</span>
                <p className="text-white font-display font-bold text-base mb-2 leading-tight">{hoveredEvent.event}</p>
                <div className="w-12 h-0.5 bg-amber-500/20 mx-auto mb-3" />
                <p className="text-[11px] text-slate-400 font-serif italic leading-relaxed line-clamp-3">
                    {hoveredEvent.significance}
                </p>
                {hoveredEvent.image && (
                    <div className="mt-4 w-full h-16 rounded-xl overflow-hidden border border-white/5 opacity-40">
                        <img src={hoveredEvent.image.image_url} className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 flex justify-center">
        <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Hover nodes to preview • Click to materialize details</p>
        </div>
      </footer>

      {selectedEvent && (
        <div 
            className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-12 z-[500] animate-fade-in"
            onClick={() => { setSelectedEvent(null); stopAudio(); }}
        >
            <div 
                className="bg-[#0a0909] w-full max-w-6xl h-full lg:h-auto lg:max-h-[85vh] rounded-[3.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col lg:flex-row overflow-hidden group"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-full lg:w-1/2 h-80 lg:h-auto bg-black relative flex-shrink-0 group/img">
                    {selectedEvent.image ? (
                        <img 
                            src={selectedEvent.image.image_url} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-105" 
                            alt={selectedEvent.image.prompt} 
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                            <SparklesIcon className="w-20 h-20 mb-4 opacity-10" />
                            <span className="text-[10px] font-black uppercase tracking-widest">DNA Projection Pending</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-10 left-10 text-left">
                        <span className="text-amber-500 font-mono text-xs font-bold uppercase tracking-[0.4em] mb-4 block">{selectedEvent.year} Artifact</span>
                        <h4 className="text-4xl font-display font-black text-white tracking-tighter">{selectedEvent.event}</h4>
                    </div>
                </div>

                <div className="flex-1 p-10 lg:p-20 overflow-y-auto relative bg-white/[0.02]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-amber-500/10 to-transparent" />
                    
                    <button 
                        onClick={() => { setSelectedEvent(null); stopAudio(); }} 
                        className="absolute top-10 right-10 p-3 bg-white/5 hover:bg-gemynd-oxblood rounded-full text-white/40 hover:text-white transition-all transform hover:rotate-90"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>

                    <div className="space-y-12 max-w-2xl">
                        <header className="flex justify-between items-center">
                           <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <ShieldIcon className="w-4 h-4 text-amber-500" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Historical Verification: STABLE</span>
                           </div>
                           
                           <button 
                                onClick={() => handleHearMoment(selectedEvent)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all transform active:scale-95 shadow-xl ${isNarrating ? 'bg-gemynd-oxblood text-white' : 'bg-amber-500 text-black hover:bg-amber-400'}`}
                           >
                                {isSynthesizing ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : isNarrating ? (
                                    <StopIcon className="w-3 h-3" />
                                ) : (
                                    <SpeakerWaveIcon className="w-3 h-3" />
                                )}
                                {isSynthesizing ? 'Tuning Node...' : isNarrating ? 'Pause Moment' : 'Hear the Moment'}
                           </button>
                        </header>

                        <section className="space-y-6">
                            <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Atmospheric Narration</h5>
                            <p className="text-2xl lg:text-3xl text-white font-serif italic leading-relaxed drop-shadow-lg">
                                "{selectedEvent.evocative_narration || localNarration[selectedEvent.id] || "Consulting the Scribe for era details..."}"
                                {!selectedEvent.evocative_narration && !localNarration[selectedEvent.id] && !isSynthesizing && (
                                    <button 
                                        onClick={() => handleHearMoment(selectedEvent)}
                                        className="ml-4 text-xs font-mono text-amber-500/60 hover:text-amber-500 underline uppercase tracking-tighter"
                                    >
                                        [Initialize_Scribe_Uplink]
                                    </button>
                                )}
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manuscript Segment</h5>
                            <p className="text-lg text-slate-300 leading-relaxed font-serif italic">
                                {selectedEvent.significance}
                            </p>
                        </section>

                        {selectedEvent.details && (
                            <section className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 flex gap-6 items-start hover:bg-white/[0.07] transition-all">
                                <SparklesIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest mb-3">Evocative Sensor Node</p>
                                    <p className="text-lg text-amber-100/60 font-serif italic leading-relaxed">
                                        {selectedEvent.details}
                                    </p>
                                </div>
                            </section>
                        )}

                        {selectedEvent.historical_context && (
                            <section className="pt-10 border-t border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <ShieldIcon className="w-3 h-3 text-blue-500/60" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anchoring Intelligence</p>
                                </div>
                                <p className="text-sm text-slate-500 italic leading-relaxed font-medium">
                                    {selectedEvent.historical_context}
                                </p>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TimelineVisualizer;