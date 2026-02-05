
import React, { useState, useEffect } from 'react';
import { getConnectivitySettings } from '../services/connectivityService';

// Reusing existing API logic but keeping this component self-contained for testing transparency
async function checkBackendHealth() {
  const API_BASE = getConnectivitySettings().backendUrl.replace(/\/$/, '');
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return null;
  }
}

async function generateStoryTest(transcript: string, storytellerName: string) {
  const API_BASE = getConnectivitySettings().backendUrl.replace(/\/$/, '');
  try {
    const response = await fetch(`${API_BASE}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        storyteller_name: storytellerName,
        auto_cascade: true,
        include_images: true,
        style: "eloquent"
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Story generation failed:", error);
    throw error;
  }
}

export const BackendTest: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [storyResult, setStoryResult] = useState<any>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = getConnectivitySettings().backendUrl;

  useEffect(() => {
    testBackend();
  }, []);

  const testBackend = async () => {
    setTesting(true);
    const result = await checkBackendHealth();
    setHealth(result);
    setTesting(false);
  };

  const runMagicTest = async () => {
      setStoryLoading(true);
      setError(null);
      try {
          const res = await generateStoryTest("My grandmother lived in a small cottage by the sea. She loved baking bread.", "Grandma Test");
          setStoryResult(res);
      } catch (e: any) {
          setError(e.message);
      } finally {
          setStoryLoading(false);
      }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white">🔌 Backend Connection Test</h2>
      
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            health?.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-white">
              {health?.status === 'healthy'
                ? `🟢 Online (v${health.version})` 
                : '⚪ Offline - Client Mode Active'}
            </div>
            {health?.status === 'healthy' && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gemini: {health.gemini} | Supabase: {health.supabase}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-xs text-slate-500 font-mono bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
          {API_BASE}
        </div>
        
        <div className="flex gap-2">
            <button
            onClick={testBackend}
            disabled={testing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
            {testing ? '🔄 Testing...' : '🔌 Test Connection'}
            </button>
            
            <button
            onClick={runMagicTest}
            disabled={storyLoading || !health}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
            {storyLoading ? '✨ Generating...' : '✨ Test Magic Cascade'}
            </button>
        </div>
      </div>

      {health?.status === 'healthy' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">
            ✅ Backend Features Available:
          </h3>
          <ul className="text-sm space-y-1 text-green-700 dark:text-green-400">
            <li>• Aurora Scanline Visual Generation</li>
            <li>• Cloud Story Persistence</li>
            <li>• Enhanced Quality Assessment</li>
          </ul>
        </div>
      )}

      {(!health || health.status !== 'healthy') && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">
            ℹ️ Client Mode Active
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            All features work locally in your browser. Backend features like Aurora Scanline visuals will be available when connection is restored.
          </p>
        </div>
      )}
      
      {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              Error: {error}
          </div>
      )}
      
      {storyResult && (
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-white">Generation Result:</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Narrative Length: {storyResult.narrative?.length} chars</p>
              {storyResult.aurora_prompts && (
                  <div className="text-xs bg-purple-50 dark:bg-purple-900/20 p-2 rounded text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <strong>Aurora Prompts Generated:</strong> {storyResult.aurora_prompts.length}
                  </div>
              )}
              <pre className="text-[10px] overflow-auto max-h-32 bg-slate-200 dark:bg-slate-950 p-2 rounded text-slate-600 dark:text-slate-400">
                  {JSON.stringify(storyResult, null, 2)}
              </pre>
          </div>
      )}
    </div>
  );
};
