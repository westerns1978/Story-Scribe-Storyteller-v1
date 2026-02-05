import React from 'react';

const FilmIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v18M3 6h18M3 18h18M9.75 3h4.5M9.75 21h4.5M3 9h18M3 15h18" />
    </svg>
);

export default FilmIcon;
