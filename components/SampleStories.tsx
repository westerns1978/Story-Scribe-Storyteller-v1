import React, { useState } from 'react';
import SampleStoryAssetModal from './SampleStoryAssetModal';
import { SampleStory } from '../types';

const sampleStories: SampleStory[] = [
  {
    name: 'Eleanor',
    description: 'A life of resilience, love, and quiet strength through changing times.',
    thumbnail: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/eleanor-01.png',
    assets: {
        images: [
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/eleanor-01.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/eleanor-02.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/eleanor-03.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/eleanor-04.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/eleanor-05.png',
        ],
        storyUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/Eleanor.txt',
        elementsUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/eleanor/Eleanor-elements.txt',
    }
  },
  {
    name: 'Tommy',
    description: 'Tales of youthful adventure, hard work, and lessons learned along the way.',
    thumbnail: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/Gemini_Generated_Image_rv70b4rv70b4rv70.png',
    assets: {
        images: [
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/Gemini_Generated_Image_n6ag8bn6ag8bn6ag.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/Gemini_Generated_Image_r9vvevr9vvevr9vv.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/Gemini_Generated_Image_rv70b4rv70b4rv70.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/Gemini_Generated_Image_sc3zm9sc3zm9sc3z.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/Gemini_Generated_Image_su4gfnsu4gfnsu4g.png',
        ],
        storyUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/tommy.txt',
        elementsUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/tommy/tommy-key-elements.txt',
    }
  },
  {
    name: 'Rosa',
    description: 'A vibrant journey filled with family, tradition, and cross-cultural experiences.',
    thumbnail: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/Gemini_Generated_Image_n5vcg4n5vcg4n5vc.png',
    assets: {
        images: [
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/Gemini_Generated_Image_d54ekzd54ekzd54e.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/Gemini_Generated_Image_n5vcg4n5vcg4n5vc.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/Gemini_Generated_Image_vc0565vc0565vc05.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/Gemini_Generated_Image_xds751xds751xds7.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/Gemini_Generated_Image_z0oqdnz0oqdnz0oq.png',
        ],
        storyUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/rosa.txt',
        elementsUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/rosa/rosa-key-elements.txt',
    }
  },
  {
    name: 'Jim',
    description: 'A story of dedication, service, and the enduring bonds of friendship.',
    thumbnail: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/Gemini_Generated_Image_mov66kmov66kmov6.png',
    assets: {
        images: [
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/Gemini_Generated_Image_ekg352ekg352ekg3.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/Gemini_Generated_Image_glgtdtglgtdtglgt.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/Gemini_Generated_Image_jgy0hijgy0hijgy0.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/Gemini_Generated_Image_mov66kmov66kmov6.png',
            'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/Gemini_Generated_Image_t7pnnct7pnnct7pn.png',
        ],
        storyUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/jim.txt',
        elementsUrl: 'https://storage.googleapis.com/westerns1978-digital-assets/Websites/story-scribe/sample-stories/jim/jim-elements.txt',
    }
  },
];

interface SampleStoriesProps {
    onLoadSample: (storytellerName: string, storyUrl: string, elementsUrl: string) => void;
}

const SampleStories: React.FC<SampleStoriesProps> = ({ onLoadSample }) => {
    const [selectedStory, setSelectedStory] = useState<SampleStory | null>(null);
    const [loadingStory, setLoadingStory] = useState<string | null>(null);

    const handleLoadRequest = async (story: SampleStory) => {
        setLoadingStory(story.name);
        await onLoadSample(story.name, story.assets.storyUrl, story.assets.elementsUrl);
        setTimeout(() => setLoadingStory(null), 3000); 
    };

    return (
        <>
            <div className="w-full max-w-5xl mx-auto py-8">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center">Explore Sample Stories</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300 text-center">Click a story to explore its assets and create your own version.</p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sampleStories.map((story) => (
                        <button
                            key={story.name}
                            onClick={() => setSelectedStory(story)}
                            disabled={!!loadingStory}
                            className="group relative block text-left bg-white/30 dark:bg-slate-800/30 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/20 dark:border-slate-700/30 transition-all duration-300 hover:shadow-2xl hover:border-blue-500/50 hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="aspect-[4/3] relative">
                                <img
                                    src={story.thumbnail}
                                    alt={story.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h4 className="font-bold text-xl text-white text-center shadow-black drop-shadow-md">{story.name}</h4>
                                </div>
                            </div>
                            
                            {loadingStory === story.name && (
                                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white">
                                    <svg className="animate-spin h-8 w-8 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-sm font-semibold">Loading Story...</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            {selectedStory && (
                <SampleStoryAssetModal
                    isOpen={!!selectedStory}
                    onClose={() => setSelectedStory(null)}
                    story={selectedStory}
                    onLoad={handleLoadRequest}
                />
            )}
        </>
    );
};

export default SampleStories;