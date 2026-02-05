import React from 'react';
const RobotIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A18.732 18.732 0 0 1 12 22.5c-2.786 0-5.433-.608-7.499-1.682Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-1.5 0V10.5a.75.75 0 0 1 .75-.75Zm-2.25.75a.75.75 0 0 0-1.5 0v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008Zm4.5 0a.75.75 0 0 0-1.5 0v.008a.75.75 0 0 0 1.5 0v-.008Z" />
    </svg>
);
export default RobotIcon;
