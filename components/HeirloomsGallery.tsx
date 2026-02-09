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
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 bg-gemynd-mahogany animate-fade-in">
        <div className="relative mb-8">
            <ArchiveBoxIcon className="w-24 h-24 text-white/5" />
            <SparklesIcon className="w-8 h-8 text-gemynd-agedGold/20 absolute -top-2 -right-2 animate-pulse" />
        </div>
        <h3 className="text-3xl font-display font-black text-white/80 tracking-tighter uppercase">Vault Empty</h3>
        <p className="text-white/20 mt-4 max-w-sm font-serif italic text-lg leading-relaxed">
          The archive node hasn't identified any significant physical artifacts to materialise yet. Upload photos to populate the heritage vault.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#050404] p-8 md:p-20 overflow-y-auto scroll-viewport animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-24">
        <header className="text-center relative">
          <span className="text-gemynd-agedGold font-black tracking-[0.6em] uppercase text-[10px] mb-6 block">The Heritage Collection</span>
          <h2 className="text-5xl md:text-8xl font-display font-black text-white tracking-tighter">Heirlooms.</h2>
          <div className="w-24 h-0.5 bg-gemynd-oxblood mx-auto mt-8 opacity-40 rounded-full" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 pb-48">
          {artifacts.map((item, index) => (
            <div key={index} className="group flex flex-col animate-slide-up" style={{animationDelay: `${index * 0.15}s`}}>
              <div className="relative aspect-[4/5] bg-white/[0.02] rounded-[4rem] border border-white/5 p-4 shadow-[0_40px_80px_rgba(0,0,0,0.6)] transition-all duration-[1s] group-hover:border-gemynd-agedGold/20 overflow-hidden">
                <div className="absolute top-10 right-10 z-20">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/5 shadow-xl">{item.type}</span>
                </div>
                
                {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      className="w-full h-full object-cover rounded-[3rem] opacity-70 group-hover:opacity-100 transition-all duration-[2s] group-hover:scale-110" 
                      alt={item.name} 
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 rounded-[3rem] bg-white/5 border border-white/5 group-hover:bg-white/[0.08] transition-all">
                        <SparklesIcon className="w-12 h-12 text-white/5 group-hover:text-gemynd-agedGold/30 transition-all group-hover:rotate-12" />
                        <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em] group-hover:text-white/30">Synthesis Pending</span>
                    </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
              </div>

              <div className="mt-12 space-y-6 px-6">
                <div className="flex justify-between items-baseline border-b border-white/10 pb-6">
                    <h3 className="text-3xl lg:text-4xl font-display font-black text-white tracking-tighter uppercase">{item.name}</h3>
                    <span className="text-gemynd-agedGold font-mono font-bold text-sm tracking-[0.2em]">{item.era}</span>
                </div>
                <p className="text-xl text-white/50 leading-relaxed font-serif italic group-hover:text-white/80 transition-all duration-700">
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