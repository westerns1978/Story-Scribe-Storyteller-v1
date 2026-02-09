import React from 'react';

const Loader2Icon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`relative ${className} flex items-center justify-center`}>
    <div className="absolute inset-0 border-2 border-gemynd-agedGold/10 rounded-full"></div>
    <div className="absolute inset-0 border-2 border-t-gemynd-agedGold border-l-gemynd-agedGold/40 rounded-full animate-spin"></div>
    <div className="w-1 h-1 bg-gemynd-agedGold rounded-full animate-pulse shadow-[0_0_10px_#D4AF37]"></div>
  </div>
);

export default Loader2Icon;