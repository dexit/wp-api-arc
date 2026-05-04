import React from 'react';
import { ProjectState, ResourceType, ViewMode } from '../types';
import { 
  Box, 
  Code, 
  GitBranch, 
  Plus, 
  FileJson,
  Network,
  Settings as SettingsIcon,
  Terminal as TerminalIcon,
  Map,
  Tag,
  Zap,
  Braces,
  Globe
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
  
  const SectionHeader = ({ label }: { label: string }) => (
    <div className="px-4 mt-6 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</div>
  );

  const NavItem = ({ 
    active, 
    onClick, 
    icon: Icon, 
    label, 
    subLabel 
  }: { 
    active: boolean; 
    onClick: () => void; 
    icon: any; 
    label: string; 
    subLabel?: string 
  }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 mx-2 rounded-md flex items-center gap-3 transition-all group ${
        active 
          ? 'bg-zinc-800 text-white shadow-sm' 
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
      }`}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <Icon size={16} className={`${active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
      <div className="flex flex-col leading-none">
        <span className="text-sm font-medium">{label}</span>
        {subLabel && <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">{subLabel}</span>}
      </div>
    </button>
  );

  const AddButton = ({ onClick, label }: { onClick: () => void, label: string }) => (
    <button 
      onClick={onClick}
      className="ml-4 mt-1 text-xs text-zinc-500 hover:text-indigo-400 flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-zinc-900 w-fit"
    >
      <Plus size={12} /> {label}
    </button>
  );

  return (
    <div className="w-64 bg-[#121214] flex flex-col border-r border-zinc-800 h-full">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-4 border-b border-zinc-800/50">
        <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
          <Zap size={14} className="text-white fill-white" />
        </div>
        <span className="font-bold text-sm tracking-wide text-zinc-100">API Architect</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        
        <SectionHeader label="Core Architecture" />
        <NavItem 
          active={currentView === 'flow'} 
          onClick={() => onViewChange('flow')} 
          icon={GitBranch} 
          label="Flow Designer" 
        />
        <NavItem 
          active={currentView === 'blueprint'} 
          onClick={() => onViewChange('blueprint')} 
          icon={Map} 
          label="Blueprint" 
        />
        <NavItem 
          active={currentView === 'code'} 
          onClick={() => onViewChange('code')} 
          icon={Braces} 
          label="Global Logic"
          subLabel="Helper Functions"
        />

        <SectionHeader label="Content Models" />
        <div className="space-y-0.5">
          {project.postTypes.map(pt => (
            <NavItem 
              key={pt.id}
              active={selection.id === pt.id && selection.type === 'postType'} 
              onClick={() => onSelect('postType', pt.id)} 
              icon={Box} 
              label={pt.pluralName}
              subLabel={pt.slug}
            />
          ))}
          <AddButton onClick={onAddResource} label="New Model" />
        </div>

        <SectionHeader label="Endpoints" />
        <div className="space-y-0.5">
          {project.customEndpoints.map(ep => (
            <NavItem 
              key={ep.id}
              active={selection.id === ep.id && selection.type === 'endpoint'} 
              onClick={() => onSelect('endpoint', ep.id)} 
              icon={Network} 
              label={ep.route}
              subLabel={ep.method}
            />
          ))}
          <AddButton onClick={onAddEndpoint} label="New Route" />
        </div>

        <SectionHeader label="Taxonomies" />
        <div className="space-y-0.5">
           {project.taxonomies.map(tax => (
             <NavItem
               key={tax.id}
               active={selection.id === tax.id && selection.type === 'taxonomy'}
               onClick={() => onSelect('taxonomy', tax.id)}
               icon={Tag}
               label={tax.pluralName}
             />
           ))}
           <AddButton onClick={onAddTaxonomy} label="New Taxonomy" />
        </div>

        <SectionHeader label="Build" />
        <NavItem active={currentView === 'openapi'} onClick={() => onViewChange('openapi')} icon={FileJson} label="OpenAPI Spec" />
        <NavItem active={currentView === 'php'} onClick={() => onViewChange('php')} icon={Code} label="Code Export" />
        <NavItem active={currentView === 'playground'} onClick={() => onViewChange('playground')} icon={Globe} label="Live Playground" />
        <NavItem active={currentView === 'settings'} onClick={() => onViewChange('settings')} icon={SettingsIcon} label="Settings" />

      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-zinc-800 bg-[#0e0e11] space-y-2">
        <button 
          onClick={onToggleTerminal}
          className={`w-full py-2 px-3 rounded-md flex items-center gap-2 text-xs font-mono transition-all border ${
            isTerminalOpen 
              ? 'bg-zinc-800 text-green-400 border-zinc-700' 
              : 'text-zinc-500 border-transparent hover:bg-zinc-800/50'
          }`}
        >
          <TerminalIcon size={14} /> 
          <span className="flex-1 text-left">{isTerminalOpen ? 'Hide Console' : 'Show Console'}</span>
        </button>
        
        <button 
          onClick={onOpenAI}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded-md shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 text-xs font-bold tracking-wide transition-all border border-indigo-500/50"
        >
          <Zap size={14} className="fill-white" /> AI GENERATE
        </button>
      </div>
    </div>
  );
};
