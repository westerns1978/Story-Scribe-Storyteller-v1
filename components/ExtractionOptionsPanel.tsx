import React from 'react';
import AdjustmentsIcon from './icons/AdjustmentsIcon';

interface ExtractionOptionsPanelProps {
    style: string;
    onStyleChange: (value: string) => void;
    visualStyle?: string;
    onVisualStyleChange?: (value: string) => void;
    useMagicCascade: boolean;
    onUseMagicCascadeChange: (value: boolean) => void;
}

const OptionSelect: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
}> = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-[10px] font-bold text-gemynd-terracotta/60 dark:text-gemynd-terracotta/80 uppercase tracking-widest mb-2 ml-1">{label}</label>
        <select
            value={value}
            onChange={onChange}
            className="w-full bg-white dark:bg-white/10 border border-gemynd-softPeach dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-gemynd-terracotta focus:outline-none transition-all cursor-pointer appearance-none shadow-sm"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1em'
            }}
        >
            {children}
        </select>
    </div>
);

const ToggleSwitch: React.FC<{
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}> = ({ label, enabled, onChange }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 dark:text-white/80">{label}</span>
        <button
            type="button"
            className={`${
            enabled ? 'bg-gemynd-terracotta' : 'bg-slate-200 dark:bg-white/10'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(!enabled)}
        >
            <span
            aria-hidden="true"
            className={`${
                enabled ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);


const ExtractionOptionsPanel: React.FC<ExtractionOptionsPanelProps> = ({
    style,
    onStyleChange,
    visualStyle,
    onVisualStyleChange,
    useMagicCascade,
    onUseMagicCascadeChange
}) => {
    return (
        <div className="space-y-6">
                <OptionSelect label="Narrative Voice" value={style} onChange={(e) => onStyleChange(e.target.value)}>
                    <option className="text-slate-900 bg-white" value="Eloquent (Biographical)">Eloquent (Biographical)</option>
                    <option className="text-slate-900 bg-white" value="Cinematic (Non-Linear)">Cinematic (Non-Linear)</option>
                    <option className="text-slate-900 bg-white" value="Standard Narrative">Standard Narrative</option>
                    <option className="text-slate-900 bg-white" value="Poetic & Soulful">Poetic & Soulful</option>
                    <option className="text-slate-900 bg-white" value="Journalistic / Interview">Journalistic / Interview</option>
                    <option className="text-slate-900 bg-white" value="Adventurous Saga">Adventurous Saga</option>
                </OptionSelect>

                {onVisualStyleChange && (
                    <OptionSelect label="Visual Direction" value={visualStyle || 'Cinematic (Non-Linear)'} onChange={(e) => onVisualStyleChange(e.target.value)}>
                        <option className="text-slate-900 bg-white" value="Cinematic (Non-Linear)">Cinematic (Non-Linear)</option>
                        <option className="text-slate-900 bg-white" value="Vintage">Vintage</option>
                        <option className="text-slate-900 bg-white" value="Nostalgic">Nostalgic</option>
                        <option className="text-slate-900 bg-white" value="Poetic & Soulful">Poetic & Soulful</option>
                        <option className="text-slate-900 bg-white" value="Ink Masterpiece">Ink Masterpiece</option>
                        <option className="text-slate-900 bg-white" value="Coffee Relief">Coffee Relief</option>
                        <option className="text-slate-900 bg-white" value="Cloud Scape">Cloud Scape</option>
                        <option className="text-slate-900 bg-white" value="Watercolor">Watercolor</option>
                        <option className="text-slate-900 bg-white" value="Realistic">Realistic</option>
                    </OptionSelect>
                )}

                 <div className="bg-white/60 dark:bg-white/5 p-4 rounded-2xl border border-gemynd-softPeach dark:border-white/10 space-y-4 shadow-inner">
                    <ToggleSwitch 
                        label="Agent Orchestration"
                        enabled={useMagicCascade}
                        onChange={onUseMagicCascadeChange}
                    />
                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-white/40 font-medium">
                        {useMagicCascade ? 
                        "Connie will direct the Scribe, Cartographer, and Artisan agents to build the legacy in one pass." :
                        "Manual Mode: You will review the transcript and trigger agents individually in the Story Studio."}
                    </p>
                </div>
        </div>
    );
};

export default ExtractionOptionsPanel;
