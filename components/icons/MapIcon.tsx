import React from 'react';

const MapIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0 0v2.25m0-2.25h1.5m-1.5 0H5.25m4.5 0V6.75m0 0H6.75m2.25 0h1.5m0 0V6.75m0 0h1.5m0 0h1.5m-1.5 0H9.75m6 0v2.25m0 0v2.25m0-2.25h1.5m-1.5 0H12m5.25 0V6.75m0 0h-1.5m1.5 0h-1.5m0 0H12m3.75 0H12m-2.25 0H9.75" />
    </svg>
);

export default MapIcon;