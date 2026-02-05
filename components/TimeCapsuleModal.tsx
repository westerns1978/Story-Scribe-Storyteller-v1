
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import XMarkIcon from './icons/XMarkIcon';
import GlobeAmericasIcon from './icons/GlobeAmericasIcon';
import ClockIcon from './icons/ClockIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';

interface TimeCapsuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    year: string;
    location?: string;
}

interface TimeCapsuleData {
    news: string[];
    culture: string[];
    prices: string[];
    music: string[];
    context: string;
}

const TimeCapsuleModal: React.FC<TimeCapsuleModalProps> = ({ isOpen, onClose, year, location }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TimeCapsuleData | null>(null);
    const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && year) {
            fetchContext();
        }
    }, [isOpen, year]);

    const fetchContext = async () => {
        setLoading(true);
        setError(null);
        setData(null);
        setGroundingChunks([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            // FIX: Updated to 'gemini-3-flash-preview' for basic text tasks with search grounding support
            const prompt = `Search for historical records from ${year}${location ? ` in ${location}` : ''}. 
            Construct a Time Capsule JSON object with:
            "news": 3 actual major headlines from that exact year.
            "culture": 3 real pop culture facts from then.
            "music": 3 top songs from ${year}.
            "prices": 3 real-world cost-of-living examples from ${year}.
            "context": 2-sentence vibe check.
            Format as clean JSON only.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { 
                    responseMimeType: 'application/json',
                    tools: [{ googleSearch: {} }] 
                }
            });

            if (response.text) {
                setData(JSON.parse(response.text));
                setGroundingChunks(response.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
            }
        } catch (err) {
            console.error("Time Capsule Search Error:", err);
            setError("Search grounding failed to reach historical nodes.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-800 dark:to-slate-900 p-6 flex justify-between items-start flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                            <ClockIcon className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-wider">Search-Grounded Records</span>
                        </div>
                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white font-serif">{year}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors">
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <GlobeAmericasIcon className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className="text-slate-500 font-mono tracking-widest uppercase text-xs">Consulting_Historical_Archives...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-8">{error}</div>
                    ) : data ? (
                        <div className="space-y-8">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-blue-900 dark:text-blue-100 italic text-lg font-serif leading-relaxed">"{data.context}"</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <Section title="Headlines" items={data.news} color="blue" />
                                <Section title="Pop Culture" items={data.culture} color="purple" />
                                <Section title="Top Songs" items={data.music} color="red" icon={<MusicNoteIcon className="w-4 h-4 inline mr-1"/>} />
                                <Section title="Cost of Living" items={data.prices} color="green" />
                            </div>

                            {groundingChunks.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Verification Sources</p>
                                    <div className="flex flex-wrap gap-2">
                                        {groundingChunks.map((chunk, idx) => (
                                            <a key={idx} href={chunk.web?.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors">
                                                <ExternalLinkIcon className="w-3 h-3" />
                                                <span className="max-w-[140px] truncate">{chunk.web?.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </main>
            </div>
        </div>
    );
};

const Section: React.FC<{ title: string; items: string[]; color: 'blue' | 'purple' | 'green' | 'red'; icon?: React.ReactNode }> = ({ title, items, color, icon }) => {
    const classes = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100',
        green: 'text-green-600 bg-green-50 border-green-100',
        red: 'text-red-600 bg-red-50 border-red-100',
    };
    return (
        <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/30">
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center ${color === 'blue' ? 'text-blue-500' : color === 'red' ? 'text-red-500' : color === 'green' ? 'text-green-500' : 'text-purple-500'}`}>
                {icon} {title}
            </h3>
            <ul className="space-y-2">
                {(items || []).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-sm">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"></span>
                        <span className="leading-tight">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default TimeCapsuleModal;
