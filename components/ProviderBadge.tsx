import React from 'react';

interface ProviderBadgeProps {
    provider: string;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = ({ provider }) => {
    const providerStyles: { [key: string]: { bg: string; text: string; label: string } } = {
        'xai': { bg: 'bg-blue-500', text: 'text-white', label: 'xAI' },
        'vertex': { bg: 'bg-green-500', text: 'text-white', label: 'Vertex' },
        'flux': { bg: 'bg-purple-500', text: 'text-white', label: 'Flux' },
        'default': { bg: 'bg-slate-500', text: 'text-white', label: provider },
    };

    const style = providerStyles[provider.toLowerCase()] || providerStyles['default'];

    return (
        <div 
            className={`absolute bottom-2 right-2 px-2 py-1 text-xs font-bold rounded-md ${style.bg} ${style.text} bg-opacity-80 backdrop-blur-sm`}
            title={`Generated with ${provider}`}
        >
            {style.label}
        </div>
    );
};

export default ProviderBadge;
