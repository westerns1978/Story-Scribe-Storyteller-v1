import React from 'react';

const PrintIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0c1.243-1.243 1.243-3.255 0-4.5 1.243-1.243 1.243-3.255 0-4.5-1.243-1.243-3.255-1.243-4.5 0-1.243-1.243-3.255-1.243-4.5 0-1.243 1.243-1.243 3.255 0 4.5 1.243 1.243 3.255 1.243 4.5 0 1.243 1.243 3.255 1.243 4.5 0Z" />
    </svg>
);

export default PrintIcon;
