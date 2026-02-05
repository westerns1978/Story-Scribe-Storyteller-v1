import React, { useMemo } from 'react';
import { VisualizationResponse } from '../types';
import DocumentDuplicateIcon from './icons/DocumentDuplicateIcon';
import ClockIcon from './icons/ClockIcon';
import Lightbulb02Icon from './icons/Lightbulb02Icon';
import SparklesIcon from './icons/SparklesIcon';

interface ReviewPanelProps {
    storyData: VisualizationResponse;
}

const MetricCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-start space-x-4">
        <div className="text-brand-400">{icon}</div>
        <div>
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const ReviewPanel: React.FC<ReviewPanelProps> = ({ storyData }) => {
    
    const { storybook, session_id } = storyData ?? {};
    const extraction = storybook?.extraction;
    const narrative = storybook?.narrative;

    const { wordsWritten, confidence, insights } = useMemo(() => {
        const wordCount = narrative?.split(/\s+/).filter(Boolean).length || 0;
        const conf = extraction?.metadata?.confidence_score ? `${(extraction.metadata.confidence_score * 100).toFixed(0)}%` : 'N/A';
        const insightCount = extraction?.metadata?.missing_info?.length || 0;
        return { wordsWritten: wordCount, confidence: conf, insights: insightCount };
    }, [narrative, extraction]);

    const storyTitle = extraction?.storyteller?.name ? `The Story of ${extraction.storyteller.name}` : "Untitled Story";

    return (
        <div className="p-8 space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-white">{storyTitle}</h2>
                <p className="text-sm text-gray-500 mt-1">Session ID: {session_id}</p>
            </header>

            <section>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard label="Words Written" value={wordsWritten} icon={<DocumentDuplicateIcon />} />
                    <MetricCard label="Confidence Score" value={confidence} icon={<SparklesIcon className="w-8 h-8"/>} />
                    <MetricCard label="Actionable Insights" value={insights} icon={<Lightbulb02Icon />} />
                </div>
            </section>

            <section>
                <h3 className="text-xl font-semibold text-white mb-4">Story Narrative</h3>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-h-96 overflow-y-auto">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{narrative || "No narrative has been generated for this story."}</p>
                </div>
            </section>
        </div>
    );
};

export default ReviewPanel;