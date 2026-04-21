
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveStory, StoryArchiveItem } from '../types';
import { warmTheme, modernTheme, classicTheme, Theme } from './presentationThemes';
import { exportPresentationToPdf } from '../utils/storybookUtils';
import { formatDisplayName } from '../utils/nameUtils';
import XMarkIcon from './icons/XMarkIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import DownloadIcon from './icons/DownloadIcon';

interface PresentationViewerProps {
  isOpen: boolean;
  onClose: () => void;
  story: StoryArchiveItem | ActiveStory | null;
  // FIX: Added theme prop to allow specifying the initial visual style of the presentation
  theme?: Theme;
}

const themes: { [key: string]: Theme } = {
  'Warm Memoir': warmTheme,
  'Modern': modernTheme,
  'Classic': classicTheme,
};

const SlideRenderer: React.FC<{ slide: any; theme: Theme; image: string | undefined }> = ({ slide, theme, image }) => {
    const content = Array.isArray(slide.content) ? slide.content : [slide.content];

    switch (slide.type) {
        case 'title':
            return (
                <div className={`w-full h-full flex flex-col items-center justify-center text-center p-12 ${theme.bg}`}>
                    <h1 className={`text-6xl font-bold ${theme.title} mb-4`}>{slide.title}</h1>
                    <p className={`text-2xl ${theme.subtitle}`}>{slide.subtitle}</p>
                </div>
            );
        case 'content':
            return (
                <div className={`w-full h-full flex flex-col justify-center p-16 ${theme.bg}`}>
                    <h2 className={`text-4xl font-bold ${theme.title} mb-8`}>{slide.title}</h2>
                    <ul className="space-y-4">
                        {content.map((item, index) => (
                            <li key={index} className={`text-2xl ${theme.text} flex items-start gap-3`}>
                                <span className={theme.accent}>•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        case 'quote':
            return (
                 <div className={`w-full h-full flex flex-col items-center justify-center text-center p-20 ${theme.bg}`}>
                    <p className={`text-5xl italic ${theme.text}`}>"{slide.quote}"</p>
                    {slide.author && <p className={`text-xl mt-6 ${theme.subtitle}`}>- {slide.author}</p>}
                </div>
            );
        case 'image':
            return (
                 <div className={`w-full h-full relative ${theme.bg}`}>
                    {image && <img src={image} alt={slide.caption || 'Presentation image'} className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-black/30"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-8 text-center bg-gradient-to-t from-black/70 to-transparent">
                         <p className="text-2xl text-white font-semibold">{slide.caption}</p>
                    </div>
                </div>
            );
        default:
            return <div className={`w-full h-full flex items-center justify-center p-12 ${theme.bg}`}><h2 className={`text-4xl font-bold ${theme.title}`}>{slide.title || 'Untitled Slide'}</h2></div>;
    }
};


const PresentationViewer: React.FC<PresentationViewerProps> = ({ isOpen, onClose, story, theme: initialTheme }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  // FIX: Default to provided theme's name if available, otherwise fallback to storage or default
  const [activeTheme, setActiveTheme] = useState(() => {
    if (initialTheme?.name && themes[initialTheme.name]) return initialTheme.name;
    return localStorage.getItem('presentationTheme') || 'Warm Memoir';
  });
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  const presentation = story?.extraction?.presentation_structure;
  const slides = presentation?.slides || [];
  const title = presentation?.presentation_title || formatDisplayName(story?.storytellerName) || 'Untitled Presentation';
  const validImages = (story?.generatedImages || []).filter(img => img.success && img.image_url);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (document.fullscreenElement) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    const themeKeys = Object.keys(themes);
    switch (e.key) {
      case 'ArrowRight':
      case ' ': // Space bar also advances
        if (currentSlide < slides.length - 1) setCurrentSlide(s => s + 1);
        break;
      case 'ArrowLeft':
        if (currentSlide > 0) setCurrentSlide(s => s - 1);
        break;
      case 'Escape':
        onClose();
        break;
      case 'f':
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.warn(`Could not enter fullscreen: ${err.message}`));
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        break;
      case '1':
        if (themeKeys[0]) setActiveTheme(themeKeys[0]);
        break;
      case '2':
        if (themeKeys[1]) setActiveTheme(themeKeys[1]);
        break;
      case '3':
        if (themeKeys[2]) setActiveTheme(themeKeys[2]);
        break;
    }
  }, [currentSlide, slides.length, onClose]);

  useEffect(() => {
    localStorage.setItem('presentationTheme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousemove', handleMouseMove);
      
      const fullscreenChange = () => {
        setShowControls(document.fullscreenElement === null);
        if (document.fullscreenElement !== null) {
          handleMouseMove(); // Start timer if entering fullscreen
        } else if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current); // Clear timer if exiting
        }
      };
      document.addEventListener('fullscreenchange', fullscreenChange);
      
      handleMouseMove(); // Initial call to set controls visibility

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('fullscreenchange', fullscreenChange);
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }
  }, [isOpen, handleKeyDown]);


  const handleExit = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      onClose();
  }

  if (!isOpen || !story) return null;

  const progress = ((currentSlide + 1) / slides.length) * 100;
  const theme = themes[activeTheme];
  const currentSlideData = slides[currentSlide];
  const imageForSlide = currentSlideData?.imageIndex !== undefined ? validImages[currentSlideData.imageIndex % validImages.length]?.image_url : undefined;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col select-none" role="dialog" aria-modal="true">
      <div className="relative flex-1">
        <div key={`${currentSlide}-${activeTheme}`} className="w-full h-full animate-fade-in">
             {currentSlideData ? <SlideRenderer slide={currentSlideData} theme={theme} image={imageForSlide} /> : 
             <div className="w-full h-full flex items-center justify-center text-white bg-slate-900">Presentation slide is missing or invalid.</div>}
        </div>
      </div>
      
      <div className={`absolute top-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
              <h1 className="text-lg font-bold text-white" style={{textShadow: '0 1px 3px rgba(0,0,0,0.5)'}}>{title}</h1>
              <div className="flex items-center gap-2">
                  <div className="relative group">
                      <button className="p-2 bg-black/30 rounded-full text-white hover:bg-black/60"><PaintBrushIcon /></button>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-md shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                          {Object.keys(themes).map((themeName, index) => (
                              <button key={themeName} onClick={() => setActiveTheme(themeName)} className={`w-full text-left px-3 py-1.5 text-sm rounded-md flex justify-between items-center ${activeTheme === themeName ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-700'}`}>{themeName} <span className="text-xs text-slate-400">{index + 1}</span></button>
                          ))}
                      </div>
                  </div>
                  <button onClick={() => exportPresentationToPdf(slides, formatDisplayName(story.storytellerName) || story.storytellerName, theme)} className="p-2 bg-black/30 rounded-full text-white hover:bg-black/60" title="Download as PDF"><DownloadIcon /></button>
                  <button onClick={handleExit} className="p-2 bg-black/30 rounded-full text-white hover:bg-black/60"><XMarkIcon /></button>
              </div>
          </div>
      </div>
      
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="h-1 bg-white/20">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="p-4 flex justify-center items-center gap-4 bg-gradient-to-t from-black/50 to-transparent">
              <button onClick={() => setCurrentSlide(s => Math.max(0, s - 1))} disabled={currentSlide === 0} className="p-2 bg-black/30 rounded-full text-white hover:bg-black/60 disabled:opacity-30"><ArrowLeftIcon /></button>
              <span className="text-white text-sm font-mono">{currentSlide + 1} / {slides.length}</span>
              <button onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))} disabled={currentSlide === slides.length - 1} className="p-2 bg-black/30 rounded-full text-white hover:bg-black/60 disabled:opacity-30"><ArrowRightIcon /></button>
          </div>
      </div>
    </div>
  );
};

export default PresentationViewer;
