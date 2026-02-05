import React from 'react';

const ClapperboardIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 8.25v1.517a2.25 2.25 0 0 1-1.28 2.059l-5.64 2.82a2.25 2.25 0 0 0-1.28 2.059V18.75m-5.64-2.82a2.25 2.25 0 0 0-1.28-2.059V8.25m-1.28 2.059A2.25 2.25 0 0 1 4.5 8.25v-1.5a2.25 2.25 0 0 1 2.25-2.25h10.5A2.25 2.25 0 0 1 19.5 6.75v1.5a2.25 2.25 0 0 1-2.25 2.25m-5.64 2.82a2.25 2.25 0 0 1-1.28-2.059V8.25m3.75 0V6.75m-3.75 0V6.75m0 0h3.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 6.75 2.18-2.18m10.64 0L19.5 6.75" />
    </svg>
);

export default ClapperboardIcon;
