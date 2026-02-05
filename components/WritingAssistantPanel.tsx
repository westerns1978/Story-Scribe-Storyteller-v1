import React from 'react';
import { VisualizationResponse } from '../types';

interface WritingAssistantPanelProps {
    storyData: VisualizationResponse | null;
}

const AccordionSection: React.FC<{ title: string; children?: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen }) => (
    <details className="group" open={defaultOpen}>
        <summary className="flex justify-between items-center p-3 cursor-pointer list-none bg-gray-800 rounded-md hover:bg-gray-700">
            <span className="font-semibold text-white">{title}</span>
            <svg className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
        </summary>
        <div className="p-3 text-sm text-gray-300">
            {children}
        </div>
    </details>
);

const WritingAssistantPanel: React.FC<WritingAssistantPanelProps> = ({ storyData }) => {
    const extraction = storyData?.storybook?.extraction;

    if (!storyData || !extraction) {
        return (
            <div className="p-6 h-full flex flex-col">
                 <h3 className="text-2xl font-bold text-white mb-6">Writing Assistant</h3>
                 <div className="text-gray-500">Select a story to see AI-powered insights, or story data is incomplete.</div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-6">Writing Assistant</h3>
            <div className="space-y-2 flex-1 overflow-y-auto">
                <AccordionSection title="Key Quotes">
                   <ul className="list-disc list-inside space-y-2 text-gray-400">
                        {(extraction.key_quotes || []).length > 0 ? (extraction.key_quotes || []).map((q, i) => <li key={i}>"{q}"</li>) : <li>No key quotes extracted.</li>}
                   </ul>
                </AccordionSection>
                <AccordionSection title="Tone Analysis">
                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                        <li><strong>Overall Tone:</strong> {extraction.emotional_journey?.overall_tone || 'N/A'}</li>
                        <li><strong>Current State:</strong> {extraction.emotional_journey?.current_state || 'N/A'}</li>
                        <li><strong>Turning Points:</strong> {(extraction.emotional_journey?.turning_points || []).join(', ') || 'N/A'}</li>
                    </ul>
                </AccordionSection>
                <AccordionSection title="Characters & Setting" defaultOpen>
                   <div className="space-y-3">
                       <div>
                           <h4 className="font-semibold text-gray-200 mb-1">Family</h4>
                           <ul className="list-disc list-inside space-y-1 text-gray-400">
                                {(extraction.family || []).length > 0 ? (extraction.family || []).map((p, i) => <li key={i}>{p.name} ({p.relationship})</li>) : <li>No family members identified.</li>}
                           </ul>
                       </div>
                       <div>
                           <h4 className="font-semibold text-gray-200 mb-1">Locations</h4>
                           <ul className="list-disc list-inside space-y-1 text-gray-400">
                                {(extraction.locations || []).length > 0 ? (extraction.locations || []).map((l, i) => <li key={i}>{l.name} ({l.type})</li>) : <li>No locations identified.</li>}
                           </ul>
                       </div>
                   </div>
                </AccordionSection>
            </div>
        </div>
    );
};

export default WritingAssistantPanel;