import React from 'react';

const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.3 2.841A1.5 1.5 0 0 1 9 4.382V15.618a1.5 1.5 0 0 1-2.7 1.259L.3 9.259A1.5 1.5 0 0 1 .3 6.741l6-4.382Z" />
    </svg>
);

export default PlayIcon;