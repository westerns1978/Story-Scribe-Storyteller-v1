import React from 'react';
const TestResultsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.061 16.061a1.34 1.34 0 0 1-1.897 0l-1.111-1.112a1.34 1.34 0 0 1 0-1.897l5.568-5.568a1.34 1.34 0 0 1 1.897 0l1.111 1.112a1.34 1.34 0 0 1 0 1.897l-5.568 5.568ZM5.25 3.75h.008v.008H5.25V3.75Zm.75.75h.008v.008H6V4.5Zm-.75 3h.008v.008H5.25V7.5Zm.75.75h.008v.008H6v-.008Zm.75 2.25h.008v.008H6.75V10.5Zm-3 1.5h.008v.008H3.75V12Zm.75.75h.008v.008H4.5v-.008Zm.75 2.25h.008v.008H5.25V15Zm.75.75h.008v.008H6v-.008Zm-.75 3h.008v.008H5.25V18.75Zm.75.75h.008v.008H6V19.5Zm-.75-15h.008v.008H5.25V4.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.996 17.254a1.34 1.34 0 0 1-1.897 0l-1.111-1.111a1.34 1.34 0 0 1 0-1.897l.107-.107m5.568-5.568 5.568 5.568" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.343 12.343l-3.536 3.536a1.34 1.34 0 0 1-1.897-1.897l3.536-3.536m3.535 3.536 3.536-3.536" />
    </svg>
);
export default TestResultsIcon;
