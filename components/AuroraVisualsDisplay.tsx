
import React, { useState } from 'react';
import { AuroraPrompt } from '../types';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckIcon from './icons/CheckIcon';

interface AuroraVisualsDisplayProps {
  prompts: AuroraPrompt[];
}

const AuroraVisualsDisplay: React.FC<AuroraVisualsDisplayProps> = ({ prompts }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    } catch(e) {
        console.error("Failed to copy", e);
    }
  };

  if (!prompts || prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Visual Director: Aurora Scanline
        </h2>
      </div>
      
      <p className="text-slate-400 text-sm">
        Cinematic prompts generated for AI art generators (Midjourney, Flux, Stable Diffusion).
      </p>

      <div className="grid gap-6">
        {prompts.map((prompt, idx) => (
          <div
            key={idx}
            className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/30 shadow-lg hover:shadow-purple-900/20 transition-shadow"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Timeline */}
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/20">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">
                      🕰️ Timeline
                    </span>
                    <p className="text-sm mt-1.5 text-slate-300">{prompt.timeline}</p>
                  </div>

                  {/* Atmosphere */}
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-blue-500/20">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
                      ✨ Atmosphere
                    </span>
                    <p className="text-sm mt-1.5 text-slate-300">{prompt.atmosphere}</p>
                  </div>

                  {/* Environment */}
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-500/20">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">
                      🌍 Environment
                    </span>
                    <p className="text-sm mt-1.5 text-slate-300">{prompt.environment}</p>
                  </div>
              </div>

              {/* Scanline Prompt - The Main Event */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-500/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-purple-500/5 to-blue-500/5 animate-pulse" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wide">
                      🎨 Full Scanline Prompt
                    </span>
                    <button
                      onClick={() => copyToClipboard(prompt.scanline_prompt, idx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-md transition-colors text-white text-xs font-medium border border-slate-700"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <CheckIcon className="w-3 h-3 text-green-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <ClipboardIcon className="w-3 h-3 text-slate-300" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-purple-100 leading-relaxed break-words opacity-90 group-hover:opacity-100 transition-opacity">
                    {prompt.scanline_prompt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuroraVisualsDisplay;
