import React from 'react';
import XMarkIcon from './icons/XMarkIcon';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Story Scribe Field Guide</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 lg:p-8 prose prose-sm md:prose-base dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-6">
                            <h3>📜 Interview Framework & Scripts</h3>
                            <p>This framework is a guide, not a rigid script. The goal is to spark memories and facilitate natural storytelling.</p>
                            
                            <h4>Opening Script:</h4>
                             <blockquote className="border-l-4 border-brand-500 pl-4 italic">
                                "Hi [Name], I'm here because your stories matter, and we want to help preserve them for your family. We'll use our conversation to create something beautiful with your memories - like a digital storybook with pictures and your voice. Would you like to start with something that makes you smile?"
                            </blockquote>

                            <h4>Core Question Categories:</h4>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Childhood & Family:</strong> "Tell me about the house you grew up in." / "Who was the 'character' in your family?"</li>
                                <li><strong>Coming of Age:</strong> "What was happening in the world when you were 18?" / "Tell me about your first job or first car."</li>
                                <li><strong>Life Milestones:</strong> "How did you meet your spouse?" / "What was the biggest change you lived through?"</li>
                                <li><strong>Wisdom & Legacy:</strong> "What advice would you give your younger self?" / "What are you most grateful for?"</li>
                            </ul>
                            
                            <h4>Session Management Scripts:</h4>
                             <ul className="list-disc pl-5 space-y-1 text-sm">
                                <li><strong>When tired:</strong> "You're sharing wonderful memories. Should we pause here and continue another time?"</li>
                                <li><strong>When emotional:</strong> "These memories are precious. Take your time. It sounds like that was very important to you."</li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                             <h3>🏥 Facility Approach Strategy</h3>
                             <p>Use this strategy to introduce the Memory Scribe program to care facilities.</p>
                            
                            <h4>Value Proposition:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Family Engagement:</strong> Increases family satisfaction by creating a powerful, positive touchpoint.</li>
                                <li><strong>Resident Wellbeing:</strong> Leverages the therapeutic benefits of reminiscence therapy.</li>
                                <li><strong>Marketing Differentiation:</strong> Offers a unique, high-value service that sets a facility apart.</li>
                                <li><strong>Staff Efficiency:</strong> Provides a structured activity with minimal staff overhead.</li>
                            </ul>

                             <h4>Approach Script for Directors:</h4>
                            <blockquote className="border-l-4 border-brand-500 pl-4 italic">
                                "I'd like to propose a program that creates lasting digital storybooks from your residents' life stories. This addresses three key challenges: keeping residents engaged, helping families feel connected, and providing a unique value that families remember when choosing care. The program requires minimal staff time, as I handle the technical work."
                            </blockquote>
                        </div>
                    </div>
                     <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            Implementation & Common Concerns
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Phased Implementation</h4>
                                <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-600 dark:text-slate-400">
                                    <li><strong>Pilot Program (1-2 Months):</strong> Start with 5-10 residents for free in exchange for testimonials and feedback.</li>
                                    <li><strong>Full Program:</strong> Introduce a monthly service fee, train staff on identifying candidates, and report on engagement metrics.</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Handling Objections</h4>
                                 <ul className="list-disc list-inside text-sm space-y-1.5 text-slate-600 dark:text-slate-400">
                                    <li><strong>On Dementia:</strong> "Our approach is adaptive. Even fragmented memories can be woven into meaningful content."</li>
                                     <li><strong>On Time:</strong> "I handle the technical work. Your staff's time is minimal, and this program actually helps engage residents deeply."</li>
                                     <li><strong>On Privacy:</strong> "We are fully HIPAA compliant, require explicit family consent, and the resident is always in control."</li>
                                 </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AboutModal;
