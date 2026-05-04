import React from 'react';
import { ProjectState, ResourceType, ViewMode, CustomPostType, CustomEndpoint, Taxonomy } from '../types';
import { 
  Box, 
  Code, 
  LayoutTemplate, 
  Sparkles, 
  GitBranch, 
  Plus, 
  FileJson,
  Network,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
  Map,
  Tag
} from 'lucide-react';

interface SidebarProps {
  project: ProjectState;
  currentView: ViewMode;
  selection: { type: ResourceType; id: string };
  isTerminalOpen: boolean;
  onSelect: (type: ResourceType, id: string) => void;
  onViewChange: (view: ViewMode) => void;
  onAddResource: () => void;
  onAddEndpoint: () => void;
  onAddTaxonomy: () => void;
  onToggleTerminal: () => void;
  onOpenAI: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  project,
  currentView,
  selection,
  isTerminalOpen,
  onSelect,
  onViewChange,
  onAddResource,
  onAddEndpoint,
  onAddTaxonomy,
  onToggleTerminal,
  onOpenAI
}) => {
  return (
    <div className="w-64 bg-slate-950 flex flex-col border-r border-slate-800">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <LayoutTemplate size={18} className="text-white"/>
        </div>
        <span className="font-bold text-lg tracking-tight">WP Architect</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Content Models</div>
        <div className="space-y-1 px-2 mb-6">
          {project.postTypes.map(pt => (
            <button
              key={pt.id}
              onClick={() => onSelect('postType', pt.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${selection.id === pt.id && selection.type === 'postType' && currentView === 'editor' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Box size={16} />
              {pt.pluralName}
            </button>
          ))}
          <button 
            onClick={onAddResource}
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 transition-colors border border-dashed border-slate-800 hover:border-indigo-500/50 mt-2"
          >
            <Plus size={16} /> Add Model
          </button>
        </div>

        <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxonomies</div>
        <div className="space-y-1 px-2 mb-6">
          {project.taxonomies.map(tax => (
            <button
              key={tax.id}
              onClick={() => onSelect('taxonomy', tax.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${selection.id === tax.id && selection.type === 'taxonomy' ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Tag size={16} />
              {tax.pluralName}
            </button>
          ))}
          <button 
            onClick={onAddTaxonomy}
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-slate-500 hover:text-pink-400 hover:bg-slate-900 transition-colors border border-dashed border-slate-800 hover:border-pink-500/50 mt-2"
          >
            <Plus size={16} /> Add Taxonomy
          </button>
        </div>
        
        <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">API Routes</div>
         <div className="space-y-1 px-2 mb-6">
          {project.customEndpoints.map(ep => (
            <button
              key={ep.id}
              onClick={() => onSelect('endpoint', ep.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${selection.id === ep.id && selection.type === 'endpoint' && currentView === 'editor' ? 'bg-pink-600/20 text-pink-300 border border-pink-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Network size={16} />
              <span className="truncate">{ep.route}</span>
            </button>
          ))}
          <button 
            onClick={onAddEndpoint}
            className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-slate-500 hover:text-pink-400 hover:bg-slate-900 transition-colors border border-dashed border-slate-800 hover:border-pink-500/50 mt-2"
          >
            <Plus size={16} /> Add Route
          </button>
        </div>

        <div className="px-4 mt-auto mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Architecture</div>
        <div className="space-y-1 px-2 mb-6">
           <button 
            onClick={() => onViewChange('flow')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentView === 'flow' ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <GitBranch size={16} /> Flow Designer
          </button>
          <button 
            onClick={() => onViewChange('blueprint')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentView === 'blueprint' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Map size={16} /> Blueprints
          </button>
        </div>

        <div className="px-4 mt-auto mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Build & Config</div>
        <div className="space-y-1 px-2">
          <button 
            onClick={() => onViewChange('openapi')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentView === 'openapi' ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <FileJson size={16} /> OpenAPI Spec
          </button>
          <button 
            onClick={() => onViewChange('php')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentView === 'php' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <Code size={16} /> Build (PHP/Pkg)
          </button>
          <button 
            onClick={() => onViewChange('settings')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentView === 'settings' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
          >
            <SettingsIcon size={16} /> Settings
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button 
          onClick={onToggleTerminal}
          className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-mono transition-all ${isTerminalOpen ? 'bg-slate-800 text-green-400' : 'text-slate-500 hover:bg-slate-900'}`}
        >
          <TerminalIcon size={14} /> {isTerminalOpen ? 'Hide' : 'Show'} Console
        </button>
        <button 
          onClick={onOpenAI}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-2 rounded-lg shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 font-medium transition-all"
        >
          <Sparkles size={16} /> AI Architect
        </button>
      </div>
    </div>
  );
};
