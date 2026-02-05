import React from 'react';
import { Artifact } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';

interface HeirloomsGalleryProps {
  artifacts: Artifact[];
}

const HeirloomsGallery: React.FC<HeirloomsGalleryProps> = ({ artifacts }) => {
  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-slate-950">
        <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/10">
            <ArchiveBoxIcon className="w-12 h-12 text-slate-500" />
        </div>
        <h3 className="text-2xl font-display font-bold text-white">No Heirlooms Indexed</h3>
        <p className="text-slate-500 mt-3 max-w-md font-serif italic text-lg leading-relaxed">
          The Scribe has not identified any tangible artifacts from the manuscript yet. physical objects mentioned will appear in this vault.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950 p-10 md:p-20 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-20">
          <span className="text-gemynd-red font-bold tracking-[0.4em] uppercase text-[10px] mb-4 block">The Ancestral Vault</span>
          <h2 className="text-5xl font-display font-black text-white tracking-tighter mb-4">Heirlooms & Artifacts</h2>
          <div className="w-24 h-1 bg-gemynd-red mx-auto opacity-50 rounded-full" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {artifacts.map((item, index) => (
            <div key={index} className="group flex flex-col animate-appear" style={{animationDelay: `${index * 0.2}s`}}>
              <div className="relative aspect-square bg-black rounded-[2.5rem] border border-white/10 p-4 shadow-2xl transition-all duration-700 group-hover:border-gemynd-red/40 hover:scale-[1.03] overflow-hidden group/card">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity z-10" />
                <div className="absolute top-6 right-6 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{item.type}</span>
                </div>
                
                {item.image_url ? (
                    <img src={item.image_url} className="w-full h-full object-cover rounded-2xl opacity-60 group-hover/card:opacity-90 group-hover/card:scale-105 transition-all duration-1000" alt={item.name} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/5 text-slate-700">
                        <SparklesIcon className="w-12 h-12 mb-4 text-slate-800" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">DNA Materialized</span>
                    </div>
                )}
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex justify-between items-baseline">
                    <h3 className="text-3xl font-display font-bold text-white tracking-tight">{item.name}</h3>
                    <span className="text-gemynd-red font-mono font-bold text-sm">{item.era}</span>
                </div>
                <p className="text-slate-400 text-lg leading-relaxed font-serif italic opacity-80">
                    "{item.description}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeirloomsGallery;