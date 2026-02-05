import React from 'react';
import { Enhancement } from '../types';
import WandIcon from './icons/WandIcon';

interface EnhancementCardsProps {
  enhancements: Enhancement[];
}

const EnhancementCard: React.FC<{ enhancement: Enhancement }> = ({ enhancement }) => {
    const priorityClasses = {
        high: 'border-red-500/50 bg-red-500/10',
        medium: 'border-amber-500/50 bg-amber-500/10',
        low: 'border-blue-500/50 bg-blue-500/10',
    };
    const priorityBadge = {
        high: 'bg-red-500 text-white',
        medium: 'bg-amber-500 text-white',
        low: 'bg-blue-500 text-white',
    };

    return (
        <div className={`p-4 rounded-lg border ${priorityClasses[enhancement.priority]}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-semibold text-slate-200">{enhancement.suggestion}</h4>
                    <p className="text-xs text-slate-400">Located in: {enhancement.location}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded-full ${priorityBadge[enhancement.priority]}`}>
                    {enhancement.priority}
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-900/50 p-2 rounded">
                    <p className="text-xs text-slate-500 mb-1 font-semibold">Before:</p>
                    <p className="text-slate-400 italic">"{enhancement.before_example}"</p>
                </div>
                <div className="bg-green-900/50 p-2 rounded border border-green-500/30">
                     <p className="text-xs text-green-400 mb-1 font-semibold">After:</p>
                    <p className="text-slate-200">"{enhancement.after_example}"</p>
                </div>
            </div>
            <button 
                className="mt-3 px-3 py-1 text-xs font-semibold bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200"
                onClick={() => alert('Apply suggestion functionality coming soon!')}
            >
                Apply Suggestion
            </button>
        </div>
    );
}

const EnhancementCards: React.FC<EnhancementCardsProps> = ({ enhancements }) => {
  return (
    <div>
        <h3 className="text-xl font-semibold font-serif text-slate-200 mb-4 flex items-center gap-2">
            <WandIcon className="w-5 h-5 text-violet-400" />
            AI Enhancement Suggestions
        </h3>
        <div className="space-y-4">
            {enhancements.map((enh, index) => (
                <EnhancementCard key={index} enhancement={enh} />
            ))}
        </div>
    </div>
  );
};

export default EnhancementCards;