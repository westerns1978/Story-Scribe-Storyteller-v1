import React from 'react';

const FileSadIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <circle cx="10" cy="14" r=".5" fill="currentColor"/>
        <circle cx="14" cy="14" r=".5" fill="currentColor"/>
        <path d="M10.5 17c.67-.93 2.33-.93 3 0" />
    </svg>
);

export default FileSadIcon;