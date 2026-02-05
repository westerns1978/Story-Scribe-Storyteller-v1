import React, { useState, useEffect } from 'react';
import { WelcomeScreen } from '../pages/storyteller/WelcomeScreen';
import { ConnieFullScreen } from '../pages/storyteller/ConnieFullScreen';
import { GatheringScreen } from '../pages/storyteller/GatheringScreen';
import { YourStoryScreen } from '../pages/storyteller/YourStoryScreen';
import { generateStoryWithMagic } from '../services/api';
import { ActiveStory, AutomatedProgress, NeuralAsset } from '../types';
import MagicProgressOverlay from '../components/MagicProgressOverlay';
import Toast from '../components/Toast';

export const StorytellerLayout: React.FC<{ initialSubject?: string; onLogout?: () => void }> = ({ onLogout }) => {
  const [step, setStep] = useState<'welcome' | 'gathering' | 'chat' | 'results'>('welcome');
  const [subject, setSubject] = useState('');
  const [sessionMaterial, setSessionMaterial] = useState<{
    transcript: string;
    artifacts: NeuralAsset[];
    importedTexts: { name: string; content: string }[];
  }>(() => {
    const saved = localStorage.getItem('storyscribe_session_material');
    return saved ? JSON.parse(saved) : { transcript: '', artifacts: [], importedTexts: [] };
  });

  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const [progress, setProgress] = useState<AutomatedProgress>(null);
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const savedSubject = localStorage.getItem('storyscribe_subject');
    if (savedSubject) setSubject(savedSubject);
  }, []);

  useEffect(() => {
    localStorage.setItem('storyscribe_session_material', JSON.stringify(sessionMaterial));
  }, [sessionMaterial]);

  const handleBegin = (name: string) => {
    setSubject(name);
    localStorage.setItem('storyscribe_subject', name);
    setStep('gathering');
  };

  const handleAddPhotos = (assets: NeuralAsset[]) => {
    setSessionMaterial(prev => ({
      ...prev,
      artifacts: [...prev.artifacts, ...assets]
    }));
  };

  const handleAddText = (name: string, content: string) => {
    setSessionMaterial(prev => ({
      ...prev,
      importedTexts: [...prev.importedTexts, { name, content }]
    }));
  };

  const handleRemoveArtifact = (id: string) => {
    setSessionMaterial(prev => ({
      ...prev,
      artifacts: prev.artifacts.filter(a => a.id !== id)
    }));
  };

  const handleRemoveText = (index: number) => {
    setSessionMaterial(prev => ({
      ...prev,
      importedTexts: prev.importedTexts.filter((_, i) => i !== index)
    }));
  };

  const handleConnieFinish = (data: { transcript: string }) => {
    setSessionMaterial(prev => ({
      ...prev,
      transcript: prev.transcript ? prev.transcript + '\n\n' + data.transcript : data.transcript
    }));
    setStep('gathering');
  };

  const handleCreateStory = async () => {
    setProgress('agent_scribe');
    try {
      const combinedText = [
        sessionMaterial.transcript,
        ...sessionMaterial.importedTexts.map(t => `[Imported: ${t.name}]\n${t.content}`)
      ].filter(Boolean).join('\n---\n');

      const artifactPayload = sessionMaterial.artifacts.map(a => ({
        data: a.public_url, // API handles public URLs for context too
        mimeType: a.file_type,
        extractedText: a.metadata?.summary
      }));

      const response = await generateStoryWithMagic(
        combinedText, 
        subject, 
        'Poetic & Soulful', 
        (p) => setProgress(p),
        artifactPayload as any,
        'Cinematic (Non-Linear)'
      );

      const story: ActiveStory = {
        sessionId: response.session_id,
        storytellerName: subject,
        narrative: response.narrative,
        extraction: response.extraction,
        generatedImages: response.images,
        savedAt: new Date().toISOString(),
        storyboard: response.storyboard,
        artifacts: response.artifacts || []
      };

      setActiveStory(story);
      setStep('results');
      localStorage.removeItem('storyscribe_session_material');
    } catch (e) {
      console.error(e);
      setToasts(prev => [...prev, { id: Date.now(), message: "Neural Synthesis Error. Please retry.", type: 'error' }]);
    } finally {
      setProgress(null);
    }
  };

  const handleRestart = () => {
    setStep('gathering');
    setActiveStory(null);
  };

  return (
    <div className="h-full w-full bg-gemynd-linen relative overflow-hidden flex flex-col font-sans">
      <MagicProgressOverlay progress={progress} />
      
      <main className="flex-1 h-full overflow-hidden relative">
        {step === 'welcome' && <WelcomeScreen onBegin={handleBegin} onLogout={onLogout || (() => {})} />}
        
        {step === 'gathering' && (
          <GatheringScreen 
            subject={subject} 
            material={sessionMaterial}
            onTalk={() => setStep('chat')}
            onPhotos={handleAddPhotos}
            onText={handleAddText}
            onRemoveArtifact={handleRemoveArtifact}
            onRemoveText={handleRemoveText}
            onCreate={handleCreateStory}
            onExit={onLogout || (() => {})}
          />
        )}

        {step === 'chat' && (
          <ConnieFullScreen 
            subject={subject} 
            onFinish={handleConnieFinish} 
            onBack={() => setStep('gathering')} 
          />
        )}
        
        {step === 'results' && activeStory && (
          <YourStoryScreen story={activeStory} onRestart={handleRestart} />
        )}
      </main>

      <div className="fixed bottom-6 left-6 z-[250] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(it => it.id !== t.id))} />
        ))}
      </div>
    </div>
  );
};