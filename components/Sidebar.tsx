import React, { useState } from 'react';
import { ProjectState, ResourceType, ViewMode, CustomPostType, CustomEndpoint, Taxonomy } from '../types';
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
  Moon,
  Activity,
  GripVertical
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
  onOpenAnalysis?: () => void;
  onReorderPostTypes?: (newPostTypes: CustomPostType[]) => void;
  onReorderEndpoints?: (newEndpoints: CustomEndpoint[]) => void;
  onReorderTaxonomies?: (newTaxonomies: Taxonomy[]) => void;
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
  onOpenAI,
  onOpenAnalysis,
  onReorderPostTypes,
  onReorderEndpoints,
  onReorderTaxonomies
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: 'postType' | 'endpoint' | 'taxonomy'; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
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

  const DraggableNavItem: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: any;
    label: string;
    subLabel?: string;
    type: 'postType' | 'endpoint' | 'taxonomy';
    index: number;
  }> = ({
    active,
    onClick,
    icon: Icon,
    label,
    subLabel,
    type,
    index
  }) => {
    const isDraggingThis = draggedItem?.type === type && draggedItem?.index === index;
    const isDragTarget = draggedItem?.type === type && dragOverIndex === index && draggedItem?.index !== index;

    const handleDragStart = (e: React.DragEvent) => {
      setDraggedItem({ type, index });
      e.dataTransfer.setData('text/plain', `${type}:${index}`);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
      if (draggedItem?.type === type) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
          setDragOverIndex(index);
        }
      }
    };

    const handleDragLeave = () => {
      if (dragOverIndex === index) {
        setDragOverIndex(null);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedItem && draggedItem.type === type && draggedItem.index !== index) {
        const fromIndex = draggedItem.index;
        const toIndex = index;

        if (type === 'postType' && onReorderPostTypes) {
          const updated = [...project.postTypes];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          onReorderPostTypes(updated);
        } else if (type === 'endpoint' && onReorderEndpoints) {
          const updated = [...project.customEndpoints];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          onReorderEndpoints(updated);
        } else if (type === 'taxonomy' && onReorderTaxonomies) {
          const updated = [...project.taxonomies];
          const [moved] = updated.splice(fromIndex, 1);
          updated.splice(toIndex, 0, moved);
          onReorderTaxonomies(updated);
        }
      }
      setDraggedItem(null);
      setDragOverIndex(null);
    };

    const handleDragEnd = () => {
      setDraggedItem(null);
      setDragOverIndex(null);
    };

    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className={`relative mx-2 rounded-md transition-all flex items-center group ${
          isDraggingThis ? 'opacity-40 scale-95 border border-dashed border-indigo-500' : ''
        } ${
          isDragTarget ? 'border-t-2 border-indigo-500 pt-0.5' : ''
        }`}
      >
        <button
          onClick={onClick}
          title={label}
          className={`flex-1 text-left py-1.5 rounded-md flex items-center justify-center transition-all ${
            active 
              ? 'bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-semibold' 
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-zinc-200'
          } ${isCollapsed ? 'w-10 px-0' : 'px-2.5 gap-2.5'}`}
        >
          {/* Drag Handle Grip */}
          {!isCollapsed && (
            <span 
              className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-zinc-600 group-hover:text-slate-600 dark:group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -ml-1"
              title="Drag to prioritize or reorder"
            >
              <GripVertical size={13} />
            </span>
          )}

          <Icon size={16} className={`${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-400 shrink-0'}`} />
          {!isCollapsed && (
            <div className="flex flex-col leading-none overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
              <span className="text-sm truncate">{label}</span>
              {subLabel && <span className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 font-mono truncate">{subLabel}</span>}
            </div>
          )}
        </button>
      </div>
    );
  };

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
          {project.postTypes.map((pt, idx) => (
            <DraggableNavItem 
              key={pt.id}
              active={selection.id === pt.id && selection.type === 'postType'} 
              onClick={() => onSelect('postType', pt.id)} 
              icon={Box} 
              label={pt.pluralName}
              subLabel={pt.slug}
              type="postType"
              index={idx}
            />
          ))}
          <AddButton onClick={onAddResource} label="New Model" />
        </div>

        <SectionHeader label="Endpoints" />
        <div className="space-y-0.5">
          {project.customEndpoints.map((ep, idx) => (
            <DraggableNavItem 
              key={ep.id}
              active={selection.id === ep.id && selection.type === 'endpoint'} 
              onClick={() => onSelect('endpoint', ep.id)} 
              icon={Network} 
              label={ep.route}
              subLabel={ep.method}
              type="endpoint"
              index={idx}
            />
          ))}
          <AddButton onClick={onAddEndpoint} label="New Route" />
        </div>

        <SectionHeader label="Taxonomies" />
        <div className="space-y-0.5">
           {project.taxonomies.map((tax, idx) => (
             <DraggableNavItem
               key={tax.id}
               active={selection.id === tax.id && selection.type === 'taxonomy'}
               onClick={() => onSelect('taxonomy', tax.id)}
               icon={Tag}
               label={tax.pluralName}
               type="taxonomy"
               index={idx}
             />
           ))}
           <AddButton onClick={onAddTaxonomy} label="New Taxonomy" />
        </div>

        <SectionHeader label="Build & Optimize" />
        <NavItem active={currentView === 'openapi'} onClick={() => onViewChange('openapi')} icon={FileJson} label="OpenAPI Spec" />
        <NavItem active={currentView === 'php'} onClick={() => onViewChange('php')} icon={Code} label="Code Export" />
        <NavItem active={currentView === 'playground'} onClick={() => onViewChange('playground')} icon={Globe} label="Live Playground" />
        {onOpenAnalysis && (
          <button
            type="button"
            onClick={onOpenAnalysis}
            title="Static API & DB Indexing Analysis"
            className={`text-left py-1.5 mx-2 rounded-md flex items-center justify-center transition-all group text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-900 hover:text-indigo-600 dark:hover:text-indigo-400 ${
              isCollapsed ? 'w-10 px-0' : 'w-[calc(100%-16px)] px-3 gap-3'
            }`}
          >
            <Activity size={16} className="text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
            {!isCollapsed && (
              <div className="flex flex-col leading-none overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  Static Analysis
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono font-bold">
                    Opt
                  </span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 font-mono truncate">Caching & Indexing</span>
              </div>
            )}
          </button>
        )}
        <NavItem active={currentView === 'settings'} onClick={() => onViewChange('settings')} icon={SettingsIcon} label="Settings" />

      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-[#0e0e11] space-y-2">
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-full py-2 px-3 rounded-md flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-slate-300 dark:hover:border-zinc-700"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {!isCollapsed && <span className="ml-2 text-xs">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        <button 
          onClick={onToggleTerminal}
          title={isTerminalOpen ? 'Hide Console' : 'Show Console'}
          className={`w-full py-2 px-3 rounded-md flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} text-xs font-mono transition-all border ${
            isTerminalOpen 
              ? 'bg-slate-200 dark:bg-zinc-800 text-emerald-600 dark:text-green-400 border-slate-300 dark:border-zinc-700' 
              : 'text-slate-500 dark:text-zinc-500 border-transparent hover:bg-slate-200/60 dark:hover:bg-zinc-800/50'
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
