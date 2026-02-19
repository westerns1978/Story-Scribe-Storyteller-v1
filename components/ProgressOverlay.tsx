import React, { useMemo } from 'react';

interface ProgressOverlayProps {
  stage: number; // 0 to 3
}

const STAGES = [
  {
    icon: '📖',
    title: 'Reading your story...',
    subtitle: 'Connie is listening carefully',
  },
  {
    icon: '🗺️',
    title: 'Mapping the journey...',
    subtitle: 'Tracing places and moments in time',
  },
  {
    icon: '🎨',
    title: 'Painting your memories...',
    subtitle: 'The Artisan is creating your illustrations',
  },
  {
    icon: '✨',
    title: 'Adding the finishing touches...',
    subtitle: 'Almost ready for the reveal',
  }
];

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ stage }) => {
  const current = useMemo(() => STAGES[Math.min(stage, 3)], [stage]);
  const progressPercent = useMemo(() => (stage + 1) * 25, [stage]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-6 text-center animate-appear" 
         style={{ background: 'rgba(253, 246, 236, 0.95)', backdropFilter: 'blur(8px)' }}>
      
      <div className="relative mb-12">
        {/* Pulsing Icon Circle */}
        <div className="w-32 h-32 bg-heritage-warmGold/10 rounded-full flex items-center justify-center relative animate-pulse shadow-[0_0_40px_rgba(196,151,59,0.2)] border border-heritage-warmGold/20">
          <span className="text-6xl animate-bounce-subtle">{current.icon}</span>
        </div>
      </div>

      <div className="space-y-4 max-w-md">
        {/* Main Message */}
        <div key={stage} className="animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-display italic text-heritage-ink leading-tight">
            {current.title}
          </h2>
          <p className="text-lg text-heritage-inkSoft font-sans mt-3 opacity-80 uppercase tracking-widest text-[11px] font-bold">
            {current.subtitle}
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-64 h-1.5 bg-heritage-parchment rounded-full mx-auto mt-12 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-heritage-warmGold to-heritage-burgundy transition-all duration-1000 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Decorative Brand Subtitle */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-30">
        <img 
          src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
          className="w-8 grayscale" 
          alt="Gemynd Logo"
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-heritage-ink">Neural Weaving in Progress</p>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.05); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ProgressOverlay;