import React from 'react';
import { Persona } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';

interface PersonaConfigProps {
  persona: Persona;
  onBack: () => void;
}

const PersonaConfig: React.FC<PersonaConfigProps> = ({ persona, onBack }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 p-3 rounded-lg">
            <persona.icon className="w-8 h-8 text-violet-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{persona.name}</h2>
            <p className="text-slate-400">{persona.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <TrashIcon />
            </button>
            <button 
                onClick={onBack}
                className="px-4 py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
                Change Persona
            </button>
        </div>
      </div>

      {/* System Instruction */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg text-white">System Instruction</h3>
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <PencilIcon className="w-4 h-4" /> Edit
          </button>
        </div>
        <p className="text-slate-300 leading-relaxed">{persona.systemInstruction}</p>
      </div>
      
      {/* API & Model Configuration */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="font-semibold text-lg text-white mb-6">API & Model Configuration</h3>
        <div className="space-y-6">
          {/* API Provider */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">API Provider</label>
            <input 
              type="text" 
              value={persona.apiProvider} 
              readOnly 
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200"
            />
          </div>
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">OpenAI API Key</label>
            <input 
              type="password" 
              value="******************" 
              readOnly 
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200"
            />
          </div>
          {/* Model */}
          <div>
            <input 
              type="text" 
              value={persona.model} 
              readOnly 
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200"
            />
          </div>
          {/* Assistant ID */}
          <div>
             <label className="block text-sm font-medium text-slate-300 mb-1">Assistant ID (optional)</label>
             <input 
              type="text" 
              placeholder="Enter Assistant ID"
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button className="px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 rounded-lg">Reset to Default</button>
          <button className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg text-white">Save & Close</button>
        </div>
      </div>
    </div>
  );
};

export default PersonaConfig;
