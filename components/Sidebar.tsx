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
  Globe,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarProps {
  project: ProjectState;
  currentView: ViewMode;
  selection: { type: ResourceType; id: string };
  isTerminalOpen: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
  onSelect,
  onViewChange,
  onAddResource,
  onAddEndpoint,
  onAddTaxonomy,
  onToggleTerminal,
  onOpenAI
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
    <div className={`px-4 mt-6 mb-2 text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest ${isCollapsed ? 'hidden' : 'block'}`}>{label}</div>
  );

  const NavItem: React.FC<{ 
    active: boolean; 
    onClick: () => void; 
    icon: any; 
    label: string; 
    subLabel?: string 
  }> = ({ 
    active, 
    onClick, 
    icon: Icon, 
    label, 
    subLabel 
  }) => (
    <button
      onClick={onClick}
      title={label}
      className={`text-left py-1.5 mx-2 rounded-md flex items-center justify-center transition-all group ${
        active 
          ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-semibold' 
          : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200'
      } ${isCollapsed ? 'w-10 px-0' : 'w-[calc(100%-16px)] px-3 gap-3'}`}
    >
      <Icon size={16} className={`${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-400 shrink-0'}`} />
      {!isCollapsed && (
        <div className="flex flex-col leading-none overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-sm truncate">{label}</span>
          {subLabel && <span className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 font-mono truncate">{subLabel}</span>}
        </div>
      )}
    </button>
  );

  const AddButton = ({ onClick, label }: { onClick: () => void, label: string }) => {
    if (isCollapsed) return null;
    return (
      <button 
        onClick={onClick}
        className="ml-4 mt-1 text-xs text-slate-500 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-900 w-fit"
      >
        <Plus size={12} /> {label}
      </button>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-slate-50 dark:bg-[#121214] text-slate-900 dark:text-white flex flex-col border-r border-slate-200 dark:border-zinc-800 h-full transition-all duration-300 ease-in-out`}>
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-slate-200 dark:border-zinc-800/50">
        <div className="flex items-center">
            <div className={`w-6 h-6 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/20 ${isCollapsed ? '' : 'mr-3'}`}>
            <Zap size={14} className="text-white fill-white" />
            </div>
            {!isCollapsed && <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-zinc-100 whitespace-nowrap">API Architect</span>}
        </div>
        {!isCollapsed && (
            <button onClick={() => setIsCollapsed(true)} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
        )}
        {isCollapsed && (
            <button onClick={() => setIsCollapsed(false)} className="absolute left-14 z-50 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700 hover:text-slate-900 dark:hover:text-white rounded-r p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar overflow-x-hidden">
        
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
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-full py-2 px-3 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!isCollapsed && <span className="ml-2 text-xs">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button 
          onClick={onToggleTerminal}
          title={isTerminalOpen ? 'Hide Console' : 'Show Console'}
          className={`w-full py-2 px-3 rounded-md flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} text-xs font-mono transition-all border ${
            isTerminalOpen 
              ? 'bg-zinc-800 text-green-400 border-zinc-700' 
              : 'text-zinc-500 border-transparent hover:bg-zinc-800/50'
          }`}
        >
          <TerminalIcon size={14} className="shrink-0" /> 
          {!isCollapsed && <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{isTerminalOpen ? 'Hide Console' : 'Show Console'}</span>}
        </button>
        
        <button 
          onClick={onOpenAI}
          title="AI Generate"
          className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 ${isCollapsed ? 'px-0 justify-center' : 'px-3 justify-center gap-2'} rounded-md shadow-lg shadow-indigo-900/20 flex items-center text-xs font-bold tracking-wide transition-all border border-indigo-500/50`}
        >
          <Zap size={14} className="fill-white shrink-0" /> 
          {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">AI GENERATE</span>}
        </button>
      </div>
    </div>
  );
};
