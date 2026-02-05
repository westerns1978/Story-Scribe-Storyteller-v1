import React, { useState } from 'react';

interface ConversationReviewProps {
  conversationData: {
    transcript: string;
    userResponses: string[];
  };
  onApprove: () => void;
  onContinue: () => void;
}

const ConversationReview: React.FC<ConversationReviewProps> = ({ conversationData, onApprove, onContinue }) => {
  const [showFull, setShowFull] = useState(false);
  
  const keyPoints = conversationData.userResponses
    .filter(r => r.trim().length > 30)
    .slice(0, 5)
    .map(r => {
      const first = r.split(/[.!?]/)[0];
      return first.length > 120 ? first.substring(0, 120) + '...' : first;
    });
  
  return (
    <div className="review-overlay">
      <div className="review-modal">
        <h2>Review Your Story</h2>
        <p className="review-subtitle">Make sure we captured everything</p>
        
        <div className="key-points">
          {keyPoints.map((point, i) => (
            <div key={i} className="point">
              <span className="bullet">•</span>
              <span className="text">{point}</span>
            </div>
          ))}
        </div>
        
        {showFull && (
          <div className="full-transcript">
            {conversationData.transcript}
          </div>
        )}
        
        <button 
          className="toggle-full"
          onClick={() => setShowFull(!showFull)}
        >
          {showFull ? 'Hide' : 'Show'} Full Conversation
        </button>
        
        <div className="review-actions">
          <button className="btn-secondary" onClick={onContinue}>
            Add More
          </button>
          <button className="btn-primary" onClick={onApprove}>
            Create Story
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConversationReview;