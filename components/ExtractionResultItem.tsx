
import React from 'react';
import { Extraction } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PencilIcon from './icons/PencilIcon';

interface ExtractionResultItemProps {
    extraction: Extraction;
    index: number;
    onReviewStatusChange: (index: number, status: 'verified' | 'needs_review') => void;
}

const ExtractionResultItem: React.FC<ExtractionResultItemProps> = ({ extraction, index, onReviewStatusChange }) => {
    const isVerified = extraction.review_status === 'verified';
    const confidence = extraction.confidence || 0;
    
    const confidenceColorClass = confidence >= 0.8 ? 'text-green-600 dark:text-green-400' :
                                confidence >= 0.6 ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400';

    const confidenceBarColor = confidence >= 0.8 ? 'bg-green-500' :
                                 confidence >= 0.6 ? 'bg-amber-500' :
                                 'bg-red-500';
                                 
    const statusColor = isVerified ? 'bg-green-500' : 'bg-amber-500';
    const statusRingColor = isVerified ? 'ring-green-500/30' : 'ring-amber-500/30';

    return (
        <div className={`bg-white/20 dark:bg-slate-900/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-xl p-4 space-y-3 transition-all duration-500 hover:shadow-lg hover:shadow-brand-500/10 relative overflow-hidden ${isVerified ? 'bg-green-50/10 border-green-500/30 shadow-inner' : ''}`}>
             <div className={`absolute top-3 right-3 flex items-center space-x-2 transition-opacity duration-300 ${isVerified ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {!isVerified ? (
                    <button onClick={() => onReviewStatusChange(index, 'verified')} title="Mark as Verified" className="p-1.5 bg-slate-200/50 dark:bg-slate-800/50 text-green-600 dark:text-green-400 hover:bg-green-500/20 dark:hover:bg-green-500/20 rounded-full transition-colors">
                        <CheckCircleIcon className="w-5 h-5" />
                    </button>
                ) : (
                   <div className="p-1 text-green-500 animate-[pop_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                       <CheckCircleIcon className="w-6 h-6" />
                   </div>
                )}
            </div>

            <div className="flex justify-between items-start group">
                <h4 className={`text-md font-semibold transition-colors duration-500 pr-16 ${isVerified ? 'text-green-700 dark:text-green-400' : 'text-brand-700 dark:text-brand-300'}`}>{extraction.field_name}</h4>
                 <div className="flex items-center space-x-2">
                    <span className={`text-xs capitalize font-medium transition-colors duration-500 ${isVerified ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                        {extraction.review_status.replace('_', ' ')}
                    </span>
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${statusColor} ring-2 ${statusRingColor} ${isVerified ? 'scale-125' : ''}`}></div>
                 </div>
            </div>
            
            <p className={`text-lg transition-all duration-500 break-words ${isVerified ? 'text-slate-500 italic line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                {extraction.extracted_value || <span className="text-slate-400 dark:text-slate-500">N/A</span>}
            </p>

            <div className="w-full bg-slate-200/70 dark:bg-slate-700/50 rounded-full h-1.5" title={`${Math.round(confidence * 100)}% confidence`}>
                <div 
                    className={`${confidenceBarColor} h-1.5 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${confidence * 100}%` }}
                ></div>
            </div>
            
            {extraction.source_span && (
                <div className={`p-3 rounded-lg border transition-all duration-500 ${isVerified ? 'bg-green-900/5 border-green-500/10' : 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-700/50'}`}>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 mr-1.5"><path fillRule="evenodd" d="m7.5 1.75.22.185a.75.75 0 0 0 .93-.242l.024-.043.993-1.72a.75.75 0 0 1 1.3.75l-.993 1.72-.024.043a.75.75 0 0 0 .242.93L10.435 4.5h3.315a.75.75 0 0 1 0 1.5H10.436l-1.25 2.165a.75.75 0 0 0 .242.93l.024.043.993 1.72a.75.75 0 0 1-1.3.75l-.993-1.72-.024-.043a.75.75 0 0 0-.93-.242l-.22.185-.22-.185a.75.75 0 0 0-.93.242l-.024.043-.993 1.72a.75.75 0 1 1-1.3-.75l.993-1.72.024-.043a.75.75 0 0 0-.242-.93L3.815 6H.5a.75.75 0 0 1 0-1.5h3.315l1.25-2.165a.75.75 0 0 0-.242-.93l-.024-.043-.993-1.72a.75.75 0 0 1 1.3-.75l.993 1.72.024.043a.75.75 0 0 0 .93.242l.22-.185Z" clipRule="evenodd" /></svg>
                        <span>Source Text</span>
                    </div>
                    <p className={`text-sm italic transition-colors duration-500 ${isVerified ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>"{extraction.source_span}"</p>
                </div>
            )}
            <style>{`
                @keyframes pop {
                    0% { transform: scale(0.6); opacity: 0; }
                    80% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ExtractionResultItem;
