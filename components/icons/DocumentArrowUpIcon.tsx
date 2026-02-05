import React from 'react';

const DocumentArrowUpIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.158 10.308 3.38-3.38a.75.75 0 0 1 1.06 0l3.38 3.38m-3.88-3.88v9.113M4.5 3.375A2.25 2.25 0 0 1 6.75 1.125h10.5a2.25 2.25 0 0 1 2.25 2.25v17.25a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V3.375Z" />
  </svg>
);

export default DocumentArrowUpIcon;
