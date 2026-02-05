import React, { useMemo } from 'react';
// FIX: Import ActiveResult instead of QueueItem
import { ActiveResult } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PencilIcon from './icons/PencilIcon';

interface MetricsDashboardProps {
    // FIX: The component receives the activeResult, not the whole queue.
    activeResult: ActiveResult | null;
}

const MetricCard: React.FC<{ label: string; value: string | number; colorClass: string; icon: React.ReactNode; }> = ({ label, value, colorClass, icon }) => (
    <div className="bg-white/20 dark:bg-slate-900/20 backdrop-blur-lg p-4 rounded-xl border border-white/30 dark:border-slate-700/50 flex items-center space-x-4">
        <div className={`p-2 rounded-full bg-slate-200/50 dark:bg-slate-800/50 ${colorClass}`}>
            {icon}
        </div>
        <div>
            <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</div>
        </div>
    </div>
);

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ activeResult }) => {
    
    // FIX: Logic updated to derive metrics from activeResult.
    const { totalEntities, needsReviewCount, verifiedCount } = useMemo(() => {
        if (!activeResult?.result?.extractions) {
            return { totalEntities: 0, needsReviewCount: 0, verifiedCount: 0 };
        }

        const extractions = activeResult.result.extractions;
        const totalEntities = extractions.length;
        const needsReviewCount = extractions.filter(ext => ext.review_status === 'needs_review').length;
        const verifiedCount = totalEntities - needsReviewCount;

        return { totalEntities, needsReviewCount, verifiedCount };
    }, [activeResult]);

    return (
        <div className="space-y-2 mb-6">
             <h3 className="text-md font-semibold text-slate-800 dark:text-slate-300 px-1">Review Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                    label="Entities Found" 
                    value={totalEntities} 
                    colorClass="text-brand-600 dark:text-brand-400" 
                    icon={<SparklesIcon className="w-5 h-5" />}
                />
                <MetricCard 
                    label="Verified" 
                    value={verifiedCount} 
                    colorClass="text-green-600 dark:text-green-400" 
                    icon={<CheckCircleIcon className="w-5 h-5" />}
                />
                <MetricCard 
                    label="Needs Review" 
                    value={needsReviewCount} 
                    colorClass="text-amber-500 dark:text-amber-400" 
                    icon={<PencilIcon className="w-5 h-5" />}
                />
            </div>
        </div>
    );
};

// Add SparklesIcon here to avoid circular dependency if it were in its own file and imported by MetricsDashboard
const SparklesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.813 6.133 3.515 2.03m-5.34 2.03 5.34-3.083m-5.34 3.083 2.03 3.515M6.133 9.813l2.03-3.515m0 0 3.083 5.34m-3.083-5.34 3.515 2.03M9.813 17.867l-3.515-2.03m5.34-2.03-5.34 3.083m5.34-3.083-2.03-3.515m3.727 8.913 2.03-3.515m0 0-3.083-5.34m3.083 5.34-3.515-2.03m6.15-8.213L17.867 9.813m-2.03 5.34 2.03 3.515m0 0-5.34-3.083m5.34 3.083-2.03-3.515m-1.68-9.253-3.515 2.03" />
    </svg>
);


export default MetricsDashboard;
