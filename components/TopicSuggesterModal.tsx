import React, { useMemo } from 'react';
import { StoryArchiveItem } from '../types';
import XMarkIcon from './icons/XMarkIcon';
import LightBulbIcon from './icons/LightBulbIcon';

interface TopicSuggesterModalProps {
    isOpen: boolean;
    onClose: () => void;
    story: StoryArchiveItem | null;
}

const ALL_CATEGORIES = [
    { name: "Childhood & Family Origins", keywords: ['childhood', 'family', 'grew up'] },
    { name: "Coming of Age", keywords: ['teenager', 'first job', 'first car', 'young adult'] },
    { name: "Life Milestones", keywords: ['marriage', 'children', 'career', 'milestone'] },
    { name: "Wisdom & Legacy", keywords: ['advice', 'lesson', 'legacy', 'grateful'] },
];

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
    "Childhood & Family Origins": [
        "Tell me about the house you grew up in.",
        "Who was the 'character' in your family everyone still talks about?",
        "What did your neighborhood smell or sound like?"
    ],
    "Coming of Age": [
        "What was happening in the world when you were 18?",
        "Tell me about your first job, first car, or first apartment.",
        "Who was your first love? What were they like?"
    ],
    "Life Milestones": [
        "How did you meet your spouse or your best friend?",
        "Tell me about becoming a parent or another moment you were incredibly proud of.",
        "What was the biggest historical or technological change you lived through?"
    ],
    "Wisdom & Legacy": [
        "What's one piece of advice you would give to your younger self?",
        "Looking back, what are you most grateful for?",
        "What do you want your great-grandchildren to know about you?"
    ]
};


const TopicSuggesterModal: React.FC<TopicSuggesterModalProps> = ({ isOpen, onClose, story }) => {
    
    const suggestions = useMemo(() => {
        if (!story || !story.extraction) return ALL_CATEGORIES;

        const missingCategories: { name: string; keywords: string[]; }[] = [];
        const { family, timeline, life_lessons } = story.extraction;

        if (!family || family.length === 0) {
            missingCategories.push(ALL_CATEGORIES[0]); // Childhood & Family
        }
        
        // Check if both coming of age and milestones are covered. 
        // Timeline is a good proxy for both.
        if (!timeline || timeline.length < 2) { // Need at least a couple of events
             missingCategories.push(ALL_CATEGORIES[1]); // Coming of Age
             missingCategories.push(ALL_CATEGORIES[2]); // Life Milestones
        }

        if (!life_lessons || life_lessons.length === 0) {
            missingCategories.push(ALL_CATEGORIES[3]); // Wisdom & Legacy
        }
        
        return missingCategories;

    }, [story]);

    if (!isOpen || !story) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LightBulbIcon className="w-6 h-6" />Topic Suggestions for {story.name}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="w-6 h-6"/></button>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Based on the current story, here are some topics you could explore in a follow-up conversation to create an even richer narrative.</p>
                    {suggestions.length > 0 ? (
                        <div className="space-y-6">
                            {suggestions.map(cat => (
                                <div key={cat.name}>
                                    <h3 className="font-bold text-lg text-brand-700 dark:text-brand-400 mb-2">{cat.name}</h3>
                                    <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                                        {SUGGESTED_QUESTIONS[cat.name].map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 h-full flex flex-col justify-center items-center">
                            <h3 className="text-lg font-semibold">This story is very comprehensive!</h3>
                            <p className="mt-1 text-sm">Our analysis didn't find any major gaps in the life story categories. You've covered all the key areas.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TopicSuggesterModal;