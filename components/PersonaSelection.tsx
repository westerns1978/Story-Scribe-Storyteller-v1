import React from 'react';
import { Persona } from '../types';

interface PersonaSelectionProps {
  personas: Persona[];
  onSelectPersona: (persona: Persona) => void;
}

const PersonaCard: React.FC<{ persona: Persona; onSelect: () => void }> = ({ persona, onSelect }) => (
  <button
    onClick={onSelect}
    className="bg-slate-800 p-6 rounded-lg text-left w-full h-full hover:bg-slate-700/50 border border-slate-700 hover:border-violet-600 transition-all duration-200 flex items-start gap-4"
  >
    <div className="text-violet-400 mt-1">
        <persona.icon className="w-8 h-8" />
    </div>
    <div>
        <h3 className="font-bold text-lg text-white">{persona.name}</h3>
        <p className="text-slate-400 text-sm">{persona.description}</p>
    </div>
  </button>
);

const PersonaSelection: React.FC<PersonaSelectionProps> = ({ personas, onSelectPersona }) => {
  return (
    <div className="p-8">
      <div className="text-center mb-12">
        <div className="inline-block p-4 bg-slate-800 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
        </div>
        <h2 className="text-3xl font-bold text-white">Choose a Persona</h2>
        <p className="text-slate-400 mt-2">Select an AI personality to begin your conversation.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {personas.map(persona => (
          <PersonaCard key={persona.id} persona={persona} onSelect={() => onSelectPersona(persona)} />
        ))}
      </div>
    </div>
  );
};

export default PersonaSelection;
