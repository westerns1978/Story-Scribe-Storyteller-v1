
import React from 'react';
import { StoryExtraction } from '../types';
import ClockIcon from './icons/ClockIcon';
import UsersIcon from './icons/UsersIcon';
import MapPinIcon from './icons/MapPinIcon';
import GlobeAmericasIcon from './icons/GlobeAmericasIcon';
import ShieldIcon from './icons/ShieldIcon';
import SparklesIcon from './icons/SparklesIcon';

interface ExtractionVisualizerProps {
  extraction: StoryExtraction;
}

const ExtractionVisualizer: React.FC<ExtractionVisualizerProps> = ({ extraction }) => {
  const timeline = extraction?.timeline || [];
  const family = extraction?.family || [];
  const locations = extraction?.locations || [];

  return (
    <div className="space-y-12 animate-appear">
      <section className="obsidian-card rounded-[3.5rem] p-12 border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        
        <div className="flex items-center gap-6 mb-16">
          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
            <ClockIcon className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h3 className="text-3xl font-display font-black text-white tracking-tight">The Chronological Grid</h3>
            <div className="flex items-center gap-2 mt-1">
                <ShieldIcon className="w-3 h-3 text-blue-500" />
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Verified Memory Sequence</p>
            </div>
          </div>
        </div>

        <div className="space-y-12 relative ml-6 border-l border-white/10 pl-12">
          {timeline.length > 0 ? (
            timeline.map((event, idx) => (
              <div key={idx} className="relative group/event">
                <div className="absolute -left-[53px] top-1.5 w-3 h-3 rounded-full bg-black border-2 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] group-hover/event:scale-150 group-hover/event:bg-amber-500 transition-all" />
                
                <span className="text-xs font-mono font-bold text-amber-500/60 uppercase tracking-[0.3em] block mb-2">
                  {event?.year || 'Unknown'}
                </span>
                <h4 className="text-2xl font-display font-bold text-white tracking-tight group-hover/event:text-amber-500 transition-colors">{event?.event || ''}</h4>
                <p className="text-slate-400 mt-3 leading-relaxed italic max-w-2xl text-lg">
                  {event?.significance || ''}
                </p>

                {event?.details && (
                  <div className="mt-4 px-6 py-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex gap-4 items-center group-hover/event:bg-amber-500/10 transition-all">
                    <SparklesIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-200/70 font-serif italic leading-relaxed">
                      {event.details}
                    </p>
                  </div>
                )}

                {event?.historical_context && (
                    <div className="mt-6 p-6 bg-white/[0.02] rounded-3xl border border-white/5 flex gap-5 items-start group-hover/event:bg-white/[0.04] transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/event:opacity-30 transition-opacity">
                            <ShieldIcon className="w-12 h-12 text-blue-500" />
                        </div>
                        <div className="p-2.5 bg-blue-500/10 rounded-xl relative z-10">
                            <GlobeAmericasIcon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <div className="flex items-center gap-2">
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">Historical Grounding</p>
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-[7px] text-blue-300 font-bold uppercase tracking-widest">Verified Node</span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                {event.historical_context}
                            </p>
                        </div>
                    </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center opacity-20 italic">Awaiting neural sequence generation...</div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <section className="obsidian-card rounded-[3rem] p-10 border border-white/5">
          <div className="flex items-center gap-4 mb-8">
            <UsersIcon className="w-6 h-6 text-rose-500" />
            <h3 className="text-xl font-display font-bold text-white tracking-tight">Key Figures</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {family.length > 0 ? family.map((member, idx) => (
                <div key={idx} className="px-5 py-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col hover:border-rose-500/30 transition-all">
                  <span className="text-sm font-bold text-white">{member?.name || ''}</span>
                  <span className="text-[9px] text-rose-400 uppercase font-black tracking-widest mt-1">{member?.relationship || ''}</span>
                </div>
            )) : <p className="text-white/20 text-sm italic">Nodes pending...</p>}
          </div>
        </section>

        <section className="obsidian-card rounded-[3rem] p-10 border border-white/5">
          <div className="flex items-center gap-4 mb-8">
            <MapPinIcon className="w-6 h-6 text-blue-500" />
            <h3 className="text-xl font-display font-bold text-white tracking-tight">Places of Memory</h3>
          </div>
          <div className="space-y-4">
            {locations.length > 0 ? locations.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white leading-none">{loc?.name || ''}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest mt-2 font-black">{loc?.type || ''}</p>
                  </div>
                </div>
            )) : <p className="text-white/20 text-sm italic">Spatial nodes pending...</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExtractionVisualizer;
