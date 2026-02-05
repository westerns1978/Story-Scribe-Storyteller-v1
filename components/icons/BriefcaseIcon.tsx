import React from 'react';
const BriefcaseIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.075c0 1.313-.964 2.39-2.175 2.39H5.925a2.175 2.175 0 0 1-2.175-2.39V14.15M21 7.5a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 7.5m18 0v.113c0 .552-.448 1-1 1h-2.25a1 1 0 0 1-1-1V7.5m-1.5 0-3-3m0 0-3 3m3-3v11.25m6-11.25h-2.25a1 1 0 0 0-1 1v.113c0 .552.448 1 1 1h2.25" />
    </svg>
);
export default BriefcaseIcon;
