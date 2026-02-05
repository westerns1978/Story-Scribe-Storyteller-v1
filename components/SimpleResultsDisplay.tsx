
import React from 'react';
import { ExtractionResponse } from '../types';

interface SimpleResultsDisplayProps {
    results: ExtractionResponse | null;
    isLoading: boolean;
    error: string | null;
}

const SimpleResultsDisplay: React.FC<SimpleResultsDisplayProps> = ({ results, isLoading, error }) => {
    if (isLoading) {
        return (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                <p>Loading results...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="p-4 text-center text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg">
                <p>Error: {error}</p>
            </div>
        );
    }
    
    if (!results || results.extractions.length === 0) {
        return (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                <p>No results to display. Run analysis to see extractions here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
             <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Extraction Results</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">Field Name</th>
                            <th scope="col" className="px-6 py-3">Extracted Value</th>
                            <th scope="col" className="px-6 py-3">Confidence</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.extractions.map((extraction, index) => {
                            const isVerified = extraction.review_status === 'verified';
                            return (
                                <tr 
                                    key={index} 
                                    className={`bg-white dark:bg-slate-800 border-b dark:border-slate-700 transition-all duration-500 ease-out ${isVerified ? 'opacity-60 bg-green-50/30 dark:bg-green-900/10' : ''}`}
                                >
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                        <div className="flex items-center gap-2">
                                            {isVerified && (
                                                <svg className="w-4 h-4 text-green-500 animate-[check-bounce_0.4s_ease-out]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                            {extraction.field_name}
                                        </div>
                                    </th>
                                    <td className={`px-6 py-4 transition-all duration-500 ${isVerified ? 'line-through text-slate-400' : ''}`}>
                                        {String(extraction.extracted_value)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {extraction.confidence ? (extraction.confidence * 100).toFixed(0) + '%' : 'N/A'}
                                    </td>
                                    <td className={`px-6 py-4 capitalize font-bold transition-colors duration-500 ${isVerified ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
                                        {extraction.review_status.replace('_', ' ')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
             <style>{`
                @keyframes check-bounce {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.4); }
                    100% { transform: scale(1); opacity: 1; }
                }
             `}</style>
        </div>
    );
};

export default SimpleResultsDisplay;
