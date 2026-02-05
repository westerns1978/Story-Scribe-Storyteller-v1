import React from 'react';
const WriteIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 19.82a2.25 2.25 0 0 1-1.897 1.13l-2.685.8.8-2.685a2.25 2.25 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
);
export default WriteIcon;
