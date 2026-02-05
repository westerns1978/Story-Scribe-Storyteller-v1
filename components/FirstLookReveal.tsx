import React, { useEffect, useState, useMemo } from 'react';
import { ActiveStory } from '../types';

interface StoryRevealProps {
  storyData: ActiveStory;
  onComplete: () => void;
}

const StoryReveal: React.FC<StoryRevealProps> = ({ storyData, onComplete }) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const revealItems = useMemo(() => {
    const items = [];
    const validImages = (storyData.generatedImages || []).filter(img => img.success && img.image_url);
    const keyQuotes = storyData.extraction?.key_quotes || [];
    
    if (validImages.length > 0 && keyQuotes.length > 0) {
      items.push({ image: validImages[0].image_url, text: `"${keyQuotes[0]}"` });
    }
    if (validImages.length > 1 && storyData.extraction?.timeline?.[0]?.event) {
        items.push({ image: validImages[1].image_url, text: String(storyData.extraction.timeline[0].event) });
    }
    
    // Final item is always the storyteller's name
    items.push({ 
        image: validImages.length > 2 ? validImages[2].image_url : (validImages[0]?.image_url || null), 
        text: typeof storyData.storytellerName === 'string' ? storyData.storytellerName : 'A Story Unveiled', 
        isName: true 
    });
    
    return items;
  }, [storyData]);

  useEffect(() => {
    if (currentItemIndex < revealItems.length - 1) {
      const timer = setTimeout(() => {
        setCurrentItemIndex(prev => prev + 1);
      }, 2500); // 2.5 seconds per item
      return () => clearTimeout(timer);
    } else {
      // Last item, wait a bit longer then complete
      const finalTimer = setTimeout(onComplete, 3000);
      return () => clearTimeout(finalTimer);
    }
  }, [currentItemIndex, onComplete, revealItems.length]);
  
  const currentItem = revealItems[currentItemIndex];

  return (
    <div className="reveal-screen">
      {revealItems.map((item, index) => (
        item.image && (
          <img 
            key={index}
            src={item.image} 
            alt="Story background" 
            className="background-image" 
            style={{ zIndex: index, opacity: index === currentItemIndex ? 1 : 0, transition: 'opacity 1s ease-in-out' }}
          />
        )
      ))}
      <div className="background-overlay"></div>
      
      <div key={currentItemIndex} className="reveal-content">
        {currentItem.isName ? (
          <h1 className="reveal-name">{currentItem.text}</h1>
        ) : (
          <p className="reveal-text">"{currentItem.text}"</p>
        )}
      </div>
    </div>
  );
}

export default StoryReveal;