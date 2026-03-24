import React from 'react';
import { StoryExtraction } from '../types';
import LightBulbIcon from './icons/LightBulbIcon';
import SparklesIcon from './icons/SparklesIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';

interface InspirationPanelProps {
    extraction: StoryExtraction | null;
}

const DetailChip: React.FC<{ text: string }> = ({ text }) => (
    <span className="inline-block bg-heritage-burgundy/10 text-heritage-burgundy text-xs font-medium px-2.5 py-1 rounded-full border border-heritage-burgundy/20">
        {text}
    </span>
);

const InspirationSection: React.FC<{ title: string; icon: React.ReactNode; items: any[] | undefined }> = ({ title, icon, items }) => {
    if (!items || items.length === 0) return null;

    return (
        <div>
            <h4 className="font-semibold text-heritage-ink mb-2 flex items-center gap-2 text-sm uppercase tracking-widest">
                {icon}
                {title}
            </h4>
            <div className="flex flex-wrap gap-2">
                {items.map((item, index) => {
                    const text = typeof item === 'string' ? item : (item?.name || 'Unknown');
                    return <DetailChip key={index} text={text} />;
                })}
            </div>
        </div>
    );
};


const InspirationPanel: React.FC<InspirationPanelProps> = ({ extraction }) => {
    if (!extraction) return null;

    // SAFE ACCESS
    const themes = extraction?.themes || [];
    const lifeLessons = extraction?.life_lessons || [];
    const sensoryDetails = extraction?.sensory_details || [];

    return (
        <div>
            <h3 className="text-lg font-display font-black text-heritage-ink uppercase tracking-tight mb-4">Inspiration</h3>
            <div className="space-y-5">
                <InspirationSection title="Key Themes" icon={<SparklesIcon className="w-4 h-4 text-amber-400" />} items={themes} />
                <InspirationSection title="Life Lessons" icon={<LightBulbIcon className="w-4 h-4 text-green-400" />} items={lifeLessons} />
                <InspirationSection title="Sensory Details" icon={<ChatBubbleIcon className="w-4 h-4 text-blue-400" />} items={sensoryDetails} />
                
                {(!themes.length && !lifeLessons.length && !sensoryDetails.length) && (
                    <p className="text-sm font-serif italic text-heritage-inkMuted text-center py-4">No specific creative elements were extracted. Try analyzing a more detailed story.</p>
                )}
            </div>
        </div>
    );
};

export default InspirationPanel;