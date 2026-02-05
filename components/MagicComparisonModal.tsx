import React from 'react';

interface MagicComparisonProps {
  before: string;
  after: string;
  instruction: string;
  onAccept: () => void;
  onRevert: () => void;
}

const MagicComparison: React.FC<MagicComparisonProps> = ({ before, after, instruction, onAccept, onRevert }) => {
  const beforeWordCount = (before || '').split(/\s+/).filter(Boolean).length;
  const afterWordCount = (after || '').split(/\s+/).filter(Boolean).length;
  
  return (
    <div className="magic-overlay">
      <div className="magic-modal">
        <h2>Updated: {instruction}</h2>
        
        <div className="comparison">
          <div className="compare-side">
            <div className="label">
              <span>Before</span>
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{beforeWordCount} words</span>
            </div>
            <div className="text before-text">{before || ''}</div>
          </div>
          
          <div className="divider">→</div>
          
          <div className="compare-side">
            <div className="label">
              <span>After</span>
               <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{afterWordCount} words</span>
              <span className="new-badge">NEW</span>
            </div>
            <div className="text after-text">{after || ''}</div>
          </div>
        </div>
        
        <div className="magic-actions">
          <button className="btn-undo" onClick={onRevert}>
            ← Undo
          </button>
          <button className="btn-keep" onClick={onAccept}>
            Keep Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default MagicComparison;