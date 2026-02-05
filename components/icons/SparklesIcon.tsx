import React from 'react';

const SparklesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.813 6.133 3.515 2.03m-5.34 2.03 5.34-3.083m-5.34 3.083 2.03 3.515M6.133 9.813l2.03-3.515m0 0 3.083 5.34m-3.083-5.34 3.515 2.03M9.813 17.867l-3.515-2.03m5.34-2.03-5.34 3.083m5.34-3.083-2.03-3.515m3.727 8.913 2.03-3.515m0 0-3.083-5.34m3.083 5.34-3.515-2.03m6.15-8.213L17.867 9.813m-2.03 5.34 2.03 3.515m0 0-5.34-3.083m5.34 3.083-2.03-3.515m-1.68-9.253-3.515 2.03" />
    </svg>
);

export default SparklesIcon;
