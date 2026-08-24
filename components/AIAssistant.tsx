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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-zinc-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
               <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">AI Architect</h2>
               <p className="text-slate-500 dark:text-zinc-500 text-xs text-left">Generate complete sections with one prompt</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 pb-2">
          <p className="text-slate-600 dark:text-zinc-400 mb-4 text-sm">
            Describe your API needs in plain English. E.g., "Create an Event system with Speakers and Locations."
          </p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your data model..."
            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none min-h-[140px] resize-none text-sm transition-all"
          />

          <div className="mt-3 text-[10px] text-slate-500 dark:text-zinc-500 flex justify-between font-mono uppercase tracking-wider">
             <span>Provider: <span className="text-slate-700 dark:text-zinc-300 font-bold">{settings.provider}</span></span>
             <span>Model: <span className="text-slate-700 dark:text-zinc-300">{settings.provider === 'gemini' ? settings.model : 'Native'}</span></span>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5">⚠️</span> <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 flex justify-end gap-3 bg-slate-50/80 dark:bg-zinc-900/30 border-t border-slate-200 dark:border-zinc-800/50">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-indigo-900/20"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {loading ? 'Generating...' : 'Generate Magic'}
          </button>
        </div>
      </div>
    </div>
  );
};
