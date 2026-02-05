import React from 'react';
import { QualityAssessment } from '../types';

interface QualityDashboardProps {
  quality: QualityAssessment;
}

const ProgressBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const percentage = score * 10;
  let colorClass = 'bg-red-500';
  if (percentage > 75) {
    colorClass = 'bg-green-500';
  } else if (percentage > 50) {
    colorClass = 'bg-blue-500';
  } else if (percentage > 25) {
    colorClass = 'bg-amber-500';
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className={`text-sm font-bold ${colorClass.replace('bg-', 'text-')}`}>{score}/10</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5">
        <div
          className={`${colorClass} h-2.5 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const QualityDashboard: React.FC<QualityDashboardProps> = ({ quality }) => {
  if (!quality || !quality.quality_scores) return null;

  const { quality_scores, strengths, missing_elements } = quality;

  return (
    <div>
      <h3 className="text-xl font-semibold font-serif text-slate-200 mb-4">AI Quality Assessment</h3>
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-200">Quality Scores</h4>
            <ProgressBar label="Emotional Depth" score={quality_scores.emotional_depth} />
            <ProgressBar label="Narrative Flow" score={quality_scores.narrative_flow} />
            <ProgressBar label="Authenticity" score={quality_scores.authenticity} />
          </div>
          <div className="space-y-4">
             <div>
                <h4 className="font-semibold text-slate-200 mb-2">Strengths</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                    {(strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
             </div>
             <div>
                <h4 className="font-semibold text-slate-200 mb-2">Opportunities</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                    {(missing_elements || []).map((m, i) => <li key={i}>{m}</li>)}
                </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityDashboard;