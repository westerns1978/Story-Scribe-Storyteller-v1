import React from 'react';

const WifiIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.136 11.886c3.87-3.87 10.124-3.87 13.994 0m-4.862-4.862a9 9 0 0 1 11.314 0M1.5 8.25a15 15 0 0 1 21 0" />
    </svg>
);

export default WifiIcon;
