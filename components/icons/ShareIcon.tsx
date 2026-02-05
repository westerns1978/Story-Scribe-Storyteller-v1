import React from 'react';

const ShareIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm0 0v.093c0 .641.52.1156 1.156 1.156v.093c0 .641.52 1.156 1.156 1.156H12v.093c0 .641.52 1.156 1.156 1.156v.093c0 .641.52 1.156 1.156 1.156H16.844a2.25 2.25 0 0 0 2.25-2.25v-1.5a2.25 2.25 0 0 0-2.25-2.25H13.5m-6.283 0H6.75a2.25 2.25 0 0 0-2.25 2.25v1.5c0 1.24 1.01 2.25 2.25 2.25H7.5" />
    </svg>
);

export default ShareIcon;
