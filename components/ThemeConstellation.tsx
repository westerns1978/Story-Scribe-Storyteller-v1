import React, { useMemo, useState } from 'react';
import { StoryArchiveItem } from '../types';
import XMarkIcon from './icons/XMarkIcon';

interface ThemeConstellationProps {
    story: StoryArchiveItem | null;
}

const ThemeConstellation: React.FC<ThemeConstellationProps> = ({ story }) => {
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

    const themes = story?.extraction?.themes || [];

    const themePositions = useMemo(() => {
        return themes.map(() => ({
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
            size: `${Math.random() * 1.5 + 1}rem`,
            animationDelay: `${Math.random() * 2}s`,
        }));
    }, [themes.length]);

    const relatedContent = useMemo(() => {
        if (!selectedTheme || !story?.extraction) return { quotes: [], events: [] };

        const lowercasedTheme = selectedTheme.toLowerCase();
        
        const quotes = (story.extraction.key_quotes || []).filter(q => 
            q.toLowerCase().includes(lowercasedTheme)
        );
        
        const events = (story.extraction.timeline || []).filter(e => 
            e.event.toLowerCase().includes(lowercasedTheme) || 
            e.significance.toLowerCase().includes(lowercasedTheme)
        );

        return { quotes, events };
    }, [selectedTheme, story?.extraction]);
    
    if (!story || themes.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400">
                No themes were extracted for this story.
            </div>
        );
    }

    return (
        <div className="relative h-full w-full bg-slate-900 overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-20 max-w-sm p-4 bg-slate-950/50 rounded-lg backdrop-blur-sm border border-slate-700/50">
                <h2 className="font-bold text-lg text-white">Theme Constellation</h2>
                <p className="text-sm text-slate-300 mt-1">An interactive visualization of the story's core themes. Click a star to explore related memories and quotes.</p>
            </div>
            {/* Background starfield */}
            <div className="absolute inset-0 bg-black opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #4a5568 0%, transparent 40%), radial-gradient(circle at 80% 70%, #2d3748 0%, transparent 30%)' }}></div>

            {themes.map((theme, index) => (
                <button
                    key={index}
                    className="absolute z-10 p-2 text-center text-white rounded-full transition-all duration-300 ease-in-out transform hover:scale-125 focus:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    style={{
                        top: themePositions[index].top,
                        left: themePositions[index].left,
                        width: themePositions[index].size,
                        height: themePositions[index].size,
                        animation: `pulse 4s infinite ${themePositions[index].animationDelay}`,
                    }}
                    onClick={() => setSelectedTheme(theme)}
                >
                    <span className="text-xs font-semibold leading-tight break-words">{theme}</span>
                    <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 blur-md"></div>
                </button>
            ))}

            {/* Side Panel */}
            <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-slate-800/80 backdrop-blur-lg border-l border-slate-700/50 shadow-2xl transform transition-transform duration-500 ease-in-out z-20 ${selectedTheme ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedTheme && (
                    <div className="flex flex-col h-full">
                        <header className="p-4 border-b border-slate-700/50 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold text-blue-300">{selectedTheme}</h3>
                            <button onClick={() => setSelectedTheme(null)} className="p-2 rounded-full hover:bg-slate-700">
                                <XMarkIcon className="w-6 h-6 text-slate-300" />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {relatedContent.quotes.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-300 mb-2">Key Quotes</h4>
                                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                                        {relatedContent.quotes.map((q, i) => <li key={i}>"{q}"</li>)}
                                    </ul>
                                </div>
                            )}
                             {relatedContent.events.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-300 mb-2">Timeline Events</h4>
                                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                                        {relatedContent.events.map((e, i) => <li key={i}><b>{e.year}:</b> {e.event}</li>)}
                                    </ul>
                                </div>
                            )}
                            {relatedContent.quotes.length === 0 && relatedContent.events.length === 0 && (
                                <p className="text-slate-500 italic">No direct quotes or events found for this theme.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
             <style>{`
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 0.7;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default ThemeConstellation;