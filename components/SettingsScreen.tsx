import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AIProvider, ProjectState } from '../types';
import { GEMINI_MODELS } from '../services/aiService';
import { logger } from '../utils/logger';
import { Settings, Cpu, Cloud, Key, Save, AlertTriangle, Monitor, Download, Upload } from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  project: ProjectState;
  setProject: (project: ProjectState) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onSave, project, setProject }) => {
  const [localState, setLocalState] = useState<AppSettings>(settings);
  const [localAIAvailable, setLocalAIAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for Chrome Local AI
    if (window.ai) {
      window.ai.languageModel.capabilities().then((cap: any) => {
        setLocalAIAvailable(cap.available === 'readily');
      }).catch(() => setLocalAIAvailable(false));
    } else {
      setLocalAIAvailable(false);
    }
  }, []);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalState(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localState);
    logger.success('Settings saved successfully');
  };

  const testLocalConnection = async () => {
    try {
      if (!window.ai) throw new Error("Window.ai not found");
      const session = await window.ai.languageModel.create();
      const res = await session.prompt("Ping");
      logger.info("Local AI Test Response", res);
      logger.success("Local AI Connection verified!");
    } catch (e: any) {
      logger.error("Local AI Test Failed", e.message);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(project, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'wp_api_architect_project.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    logger.success('Project exported successfully');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedProject = JSON.parse(event.target?.result as string);
        setProject(importedProject);
        logger.success('Project imported successfully');
      } catch (error) {
        logger.error('Failed to import project', 'Invalid JSON file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full w-full p-8 bg-[#0f111a] overflow-auto custom-scrollbar relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-slate-400" size={32} />
          <div>
            <h2 className="text-3xl font-bold text-white">Configuration</h2>
            <p className="text-slate-400">Manage AI Providers, Models, and Keys</p>
          </div>
        </div>

        {/* AI Provider Section */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Cpu size={20} className="text-purple-400" /> AI Provider Selection
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => handleChange('provider', AIProvider.GEMINI)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${localState.provider === AIProvider.GEMINI 
                ? 'border-purple-500 bg-purple-500/10' 
                : 'border-slate-700 bg-slate-900 hover:border-slate-600'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={20} className={localState.provider === AIProvider.GEMINI ? 'text-purple-400' : 'text-slate-500'} />
                <span className="font-bold text-white">Google Gemini (Cloud)</span>
              </div>
              <p className="text-xs text-slate-400">Uses Google's servers. Requires API Key. Most capable models.</p>
            </button>

            <button
              onClick={() => handleChange('provider', AIProvider.CHROME_LOCAL)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${localState.provider === AIProvider.CHROME_LOCAL
                ? 'border-green-500 bg-green-500/10' 
                : 'border-slate-700 bg-slate-900 hover:border-slate-600'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={20} className={localState.provider === AIProvider.CHROME_LOCAL ? 'text-green-400' : 'text-slate-500'} />
                <span className="font-bold text-white">Chrome Built-in AI (Local)</span>
              </div>
              <p className="text-xs text-slate-400">Runs locally in browser. No API Key. Experimental.</p>
              {localAIAvailable === false && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle size={10} /> Not detected. Check chrome://flags
                </div>
              )}
            </button>
          </div>

          {/* Configuration based on Provider */}
          {localState.provider === AIProvider.GEMINI && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key size={14} className="text-slate-500" />
                  </div>
                  <input
                    type="password"
                    value={localState.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="Enviroment Variable API_KEY (Default)"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Leave empty to use <code>process.env.API_KEY</code>.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Model</label>
                <select
                  value={localState.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                >
                  {GEMINI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {localState.provider === AIProvider.CHROME_LOCAL && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-300">
                  Chrome's Built-in AI uses the <code>window.ai</code> API. 
                  Ensure you have enabled "Prompt API for Gemini Nano" in <code>chrome://flags/#prompt-api-for-gemini-nano</code>.
                </p>
                <button 
                  onClick={testLocalConnection}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors border border-slate-600"
                >
                  Test Local Connection
                </button>
             </div>
          )}
        </div>

        {/* Project Data */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Save size={20} className="text-indigo-400" /> Project Data
          </h3>
          <div className="flex gap-4">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-indigo-500 rounded-lg text-sm text-white transition-colors"
            >
              <Download size={16} className="text-indigo-400" /> Export JSON
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-green-500 rounded-lg text-sm text-white transition-colors"
            >
              <Upload size={16} className="text-green-400" /> Import JSON
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Exports the complete project state including endpoints, models, taxonomies, and layout positions.
          </p>
        </div>

        {/* Global Parameters */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6">Generation Parameters</h3>
          <div>
            <div className="flex justify-between mb-1">
               <label className="text-sm font-medium text-slate-400">Temperature</label>
               <span className="text-xs text-slate-500">{localState.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localState.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              Lower values for deterministic structures, higher for more creative naming.
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-purple-900/20 transition-all"
          >
            <Save size={18} /> Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
};
