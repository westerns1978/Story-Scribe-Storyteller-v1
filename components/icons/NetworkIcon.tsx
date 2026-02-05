import React from 'react';
const NetworkIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3.75H19.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H8.25a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18.75h-.75a.75.75 0 0 0-.75.75v.75c0 .414.336.75.75.75h.75m-1.5-.75h.75m.75 0h.75m-1.5 0h.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 7.5h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 15h.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-.75a.75.75 0 0 1 .75-.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 9.75v1.5m0 3.75v.75m-5.25-.75v-1.5m7.5-3v4.5m-7.5-3h7.5" />
    </svg>
);
export default NetworkIcon;
