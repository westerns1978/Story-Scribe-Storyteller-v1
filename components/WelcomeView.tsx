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
        <div className="flex flex-col items-center bg-transparent max-w-5xl mx-auto space-y-16 lg:space-y-24">
            {/* Header Section */}
            <section className="w-full text-center px-4 animate-appear">
                <div className="space-y-10">
                    <div className="inline-flex flex-col items-center">
                        <div className="p-5 bg-white border border-heritage-parchment rounded-3xl shadow-warm mb-6">
                            <img 
                                src="https://storage.googleapis.com/gemynd-public/projects/gemynd-portal/gemnyd-branding/Gemynd_Logo_Red_Version.png" 
                                alt="Gemynd Logo" 
                                className="w-16 grayscale opacity-80"
                            />
                        </div>
                        <p className="text-[12px] font-bold text-heritage-warmGold uppercase tracking-[0.5em] mb-4">Family Legacy Preservation</p>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-6xl lg:text-8xl font-serif text-heritage-ink tracking-tight leading-tight font-light">
                            Preserve the <br/>
                            <span className="italic text-heritage-burgundy">unforgettable.</span>
                        </h1>
                        <p className="text-xl lg:text-2xl text-heritage-inkSoft max-w-2xl mx-auto leading-relaxed font-serif italic">
                            Every life is a masterpiece. We help you weave memories, artifacts, and voice into a lasting digital heritage.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
                        <button 
                            onClick={onStartStory}
                            className="px-12 py-5 bg-heritage-burgundy text-white font-bold rounded-2xl shadow-warm hover:scale-[1.03] active:scale-95 transition-all text-base uppercase tracking-widest flex items-center justify-center gap-4 min-h-[56px]"
                        >
                            <BookOpenIcon className="w-6 h-6" />
                            New Story
                        </button>
                        <button 
                            onClick={onStartRestoration}
                            className="px-12 py-5 bg-white border border-heritage-parchment text-heritage-inkSoft font-bold rounded-2xl shadow-sm hover:bg-heritage-linen active:scale-95 transition-all text-base uppercase tracking-widest min-h-[56px]"
                        >
                            Restore Photos
                        </button>
                    </div>
                </div>
            </section>

            {/* Content Divider */}
            <div className="w-full flex items-center justify-center gap-4 opacity-30">
                <div className="h-px w-20 bg-heritage-inkSoft"></div>
                <div className="w-2 h-2 rounded-full bg-heritage-warmGold"></div>
                <div className="h-px w-20 bg-heritage-inkSoft"></div>
            </div>

            {/* Feature Cards */}
            <div className="w-full px-4 lg:px-0 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                <FeatureCard 
                    title="Heritage Restoration" 
                    desc="Repair, colorize, and upscale vintage family photographs with neural intelligence."
                    icon={<SparklesIcon className="w-8 h-8" />}
                    onClick={onStartRestoration}
                    colorClass="text-heritage-warmGold bg-heritage-warmGold/5"
                />
                <FeatureCard 
                    title="Cinematic Narrative" 
                    desc="Guided oral history sessions that transform spoken memories into visual life stories."
                    icon={<BookOpenIcon className="w-8 h-8" />}
                    onClick={onStartStory}
                    colorClass="text-heritage-burgundy bg-heritage-burgundy/5"
                />
            </div>

            <div className="w-full pt-12 space-y-12">
                <div className="text-center">
                    <h2 className="text-2xl font-serif text-heritage-inkSoft italic">Curated Collections</h2>
                    <div className="w-16 h-px bg-heritage-parchment mx-auto mt-4"></div>
                </div>
                <div className="px-4">
                   <SampleStories onLoadSample={() => {}} />
                </div>
            </div>
        </div>
    );
};

const FeatureCard = ({ title, desc, icon, onClick, colorClass }: any) => (
    <button 
        onClick={onClick}
        className="bg-white p-12 lg:p-16 rounded-3xl text-left hover:bg-heritage-linen/50 transition-all duration-300 group border border-heritage-parchment shadow-warm haptic-tap"
    >
        <div className={`w-16 h-16 ${colorClass} rounded-2xl flex items-center justify-center mb-8 border border-current opacity-70 group-hover:opacity-100 transition-opacity`}>
            {icon}
        </div>
        <h3 className="text-3xl font-serif font-bold mb-4 text-heritage-ink">{title}</h3>
        <p className="text-lg text-heritage-inkSoft leading-relaxed opacity-80">{desc}</p>
        <div className="mt-8 font-bold uppercase tracking-widest text-[11px] text-heritage-warmGold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
            Get Started <span>→</span>
        </div>
    </button>
);

export default WelcomeView;