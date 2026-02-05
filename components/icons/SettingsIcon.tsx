import React from 'react';

const SettingsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.554-.22 1.196-.22 1.75 0 .548.219 1.02.684 1.11 1.226M9.594 3.94 8.25 12m9 0-1.344-8.06M15 21v-3.093c0-1.16-1.038-2.054-2.222-1.871M9 21v-3.093c0-1.16 1.038-2.054 2.222-1.871m-5.438-5.556a.562.562 0 0 1 .321.942l3.42 2.163a.562.562 0 0 0 .642 0l3.42-2.163a.562.562 0 0 1 .321-.942m-11.536 0a48.118 48.118 0 0 0 11.536 0Z" 
        />
    </svg>
);

export default SettingsIcon;
