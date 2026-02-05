import React from 'react';
const TicketIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6.75h5.25v5.25h-5.25V6.75Zm-10.5 0h5.25v5.25h-5.25V6.75Zm-4.5 0H6.75v5.25H1.5V6.75Zm10.5 6h5.25v5.25h-5.25v-5.25Zm-4.5 0H12v5.25H7.5v-5.25Zm-4.5 0h5.25v5.25H3v-5.25Z" clipRule="evenodd" />
    </svg>
);
export default TicketIcon;
