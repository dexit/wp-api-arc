import React, { useState } from 'react';
import { generateStructure } from '../services/aiService';
import { ProjectState, AppSettings } from '../types';
import { Loader2, Sparkles, X } from 'lucide-react';
import { logger } from '../utils/logger';

interface AIAssistantProps {
  project: ProjectState;
  settings: AppSettings;
  onApply: (newStructure: Partial<ProjectState>) => void;
  onClose: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ project, settings, onApply, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      logger.info('User initiated AI generation', { prompt });
      const result = await generateStructure(prompt, project, settings);
      onApply(result);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to generate structure.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-2 mb-4 text-purple-400">
          <Sparkles size={24} />
          <h2 className="text-xl font-bold text-white">Gemini Architect</h2>
        </div>

        <p className="text-slate-300 mb-4 text-sm">
          Describe your API needs in plain English. E.g., "Create an Event system with Speakers and Locations."
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your data model..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none min-h-[120px]"
        />

        <div className="mt-2 text-xs text-slate-500 flex justify-between">
           <span>Provider: <span className="text-slate-300 font-bold">{settings.provider}</span></span>
           <span>Model: <span className="text-slate-300">{settings.provider === 'gemini' ? settings.model : 'Native'}</span></span>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};
