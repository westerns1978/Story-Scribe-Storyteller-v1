import React from 'react';
import SampleStories from './SampleStories';
import SparklesIcon from './icons/SparklesIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import { UserTier } from '../types';

interface WelcomeViewProps {
    onStartRestoration: () => void;
    onStartStory: () => void;
    tier?: UserTier;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onStartRestoration, onStartStory, tier }) => {
    return (
        <div className="flex flex-col items-center bg-transparent max-w-5xl mx-auto">
            {/* Header Node */}
            <section className="w-full relative py-12 lg:py-24 flex flex-col items-center text-center px-4">
                <div className="relative z-10 space-y-10 animate-appear">
                    <div className="inline-block p-6 bg-white dark:bg-white/5 border border-gemynd-ink/5 rounded-[2.5rem] shadow-xl">
                        <img 
                            src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
                            alt="Gemynd Logo" 
                            className="w-16 lg:w-24 drop-shadow-md"
                        />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-5xl lg:text-8xl font-display font-black text-gemynd-ink dark:text-white tracking-tighter leading-[0.95]">
                            The Memory <br/><span className="text-gemynd-oxblood dark:text-gemynd-agedGold">Archive.</span>
                        </h1>
                        <p className="text-lg lg:text-2xl text-gemynd-ink/60 dark:text-white/40 max-w-2xl mx-auto leading-relaxed font-serif italic">
                            Synthesizing family legacy into high-fidelity digital masterpieces.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button 
                            onClick={onStartStory}
                            className="px-10 py-5 bg-gemynd-oxblood text-white font-black rounded-2xl shadow-xl hover:scale-[1.03] active:scale-95 transition-all text-xs uppercase tracking-[0.4em] flex items-center justify-center gap-3"
                        >
                            <BookOpenIcon className="w-5 h-5" />
                            Initialize Preservation
                        </button>
                        <button 
                            onClick={onStartRestoration}
                            className="px-10 py-5 bg-white dark:bg-white/10 border border-gemynd-ink/10 dark:border-white/10 text-gemynd-ink dark:text-white font-black rounded-2xl shadow-sm hover:bg-gemynd-linen dark:hover:bg-white/20 active:scale-95 transition-all text-xs uppercase tracking-[0.4em]"
                        >
                            Open Restore Studio
                        </button>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <div className="w-full px-4 lg:px-0 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                <FeatureCard 
                    title="Heritage Restoration" 
                    desc="Upscale, repair, and colorize physical artifacts with Archive Artisan AI."
                    icon={<SparklesIcon className="w-8 h-8" />}
                    onClick={onStartRestoration}
                    accent="bg-amber-100 text-amber-700"
                />
                <FeatureCard 
                    title="Cinematic Legacy" 
                    desc="Guided interviews with Connie AI to weave verbal memories into a visual journey."
                    icon={<BookOpenIcon className="w-8 h-8" />}
                    onClick={onStartStory}
                    accent="bg-rose-100 text-rose-700"
                />
            </div>

            <div className="w-full mt-24 space-y-12">
                <div className="flex items-center gap-6 px-4">
                    <h2 className="text-[10px] font-black text-gemynd-ink/20 dark:text-white/20 tracking-[0.5em] uppercase">Exhibits & Case Studies</h2>
                    <div className="flex-1 h-px bg-gemynd-ink/5 dark:bg-white/5"></div>
                </div>
                <div className="px-4">
                   <SampleStories onLoadSample={() => {}} />
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ title, desc, icon, onClick, accent }: any) => (
    <button 
        onClick={onClick}
        className="heirloom-card p-10 lg:p-14 rounded-[3rem] text-left hover:scale-[1.02] transition-all duration-500 group relative overflow-hidden haptic-tap"
    >
        <div className={`w-16 h-16 ${accent} rounded-2xl flex items-center justify-center mb-8 shadow-inner group-hover:rotate-6 transition-transform`}>
            {icon}
        </div>
        <h3 className="text-3xl font-display font-black mb-3 text-gemynd-ink dark:text-white tracking-tight">{title}</h3>
        <p className="text-lg font-serif italic text-gemynd-ink/50 dark:text-white/40 leading-relaxed">{desc}</p>
        <div className="mt-8 font-black uppercase tracking-[0.4em] text-[10px] flex items-center gap-2 text-gemynd-oxblood dark:text-gemynd-agedGold opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
            Access Terminal <span>→</span>
        </div>
    </button>
);

export default WelcomeView;