import React, { useState, useEffect } from 'react';
import { ProjectState, ViewMode, CustomPostType, CustomEndpoint, Taxonomy, ResourceType, AppSettings, AIProvider, MetaField, FieldType, GlobalHelper } from './types';
import { INITIAL_PROJECT_STATE } from './constants';
import { ResourceEditor } from './components/ResourceEditor';
import { EndpointEditor } from './components/EndpointEditor';
import { TaxonomyEditor } from './components/TaxonomyEditor';
import { CodePreview } from './components/CodePreview';
import { FlowDesigner } from './components/FlowDesigner';
import { BlueprintView } from './components/BlueprintView';
import { AIAssistant } from './components/AIAssistant';
import { SettingsScreen } from './components/SettingsScreen';
import { Terminal } from './components/Terminal';
import { Sidebar } from './components/Sidebar';
import { EditorModal } from './components/EditorModal';
import { GlobalLogicEditor } from './components/GlobalLogicEditor';
import { logger } from './utils/logger';
import { LayoutTemplate } from 'lucide-react';

interface SelectionState {
  type: ResourceType;
  id: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  provider: AIProvider.GEMINI,
  apiKey: '', 
  model: 'gemini-3-flash-preview',
  temperature: 0.7
};

const App = () => {
  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem('wp_api_architect_project');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return { ...INITIAL_PROJECT_STATE, ...parsed }; 
      } catch (e) { console.error('Failed to parse saved project'); }
    }
    return INITIAL_PROJECT_STATE;
  });
  const [currentView, setCurrentView] = useState<ViewMode>('flow'); 
  const [isAIModalOpen, setAIModalOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('wp_api_architect_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse settings'); }
    }
    return DEFAULT_SETTINGS;
  });
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('bg-white', 'text-slate-900');
      document.body.classList.add('bg-slate-900', 'text-slate-100');
    } else {
      document.body.classList.remove('dark');
      document.body.classList.remove('bg-slate-900', 'text-slate-100');
      document.body.classList.add('bg-white', 'text-slate-900');
    }
  }, [theme]);
  
  const [editingResource, setEditingResource] = useState<SelectionState | null>(null);

  // Save to localStorage effects
  useEffect(() => {
    localStorage.setItem('wp_api_architect_project', JSON.stringify(project));
  }, [project]);

  useEffect(() => {
    localStorage.setItem('wp_api_architect_settings', JSON.stringify(settings));
  }, [settings]);

  // Helper handling
  const handleUpdateHelper = (updatedHelper: GlobalHelper) => {
    setProject(prev => ({
      ...prev,
      globalHelpers: prev.globalHelpers.map(h => h.id === updatedHelper.id ? updatedHelper : h)
    }));
  };

  const handleAddHelper = () => {
    const newHelper: GlobalHelper = {
      id: `helper_${Date.now()}`,
      name: 'new_function',
      parameters: '$arg1',
      description: 'New global utility function',
      phpCode: '// Your PHP code here'
    };
    setProject(prev => ({
      ...prev,
      globalHelpers: [...prev.globalHelpers, newHelper]
    }));
    logger.success('Added new Global Helper');
  };

  const handleDeleteHelper = (id: string) => {
    setProject(prev => ({
      ...prev,
      globalHelpers: prev.globalHelpers.filter(h => h.id !== id)
    }));
    logger.info(`Deleted Global Helper ${id}`);
  };

  const handleUpdateResource = (updatedCpt: CustomPostType) => {
    setProject(prev => ({
      ...prev,
      postTypes: prev.postTypes.map(pt => pt.id === updatedCpt.id ? updatedCpt : pt)
    }));
    logger.info(`Updated Post Type: ${updatedCpt.slug}`);
  };
  
  const handleUpdateEndpoint = (updatedEndpoint: CustomEndpoint) => {
    setProject(prev => ({
      ...prev,
      customEndpoints: prev.customEndpoints.map(ep => ep.id === updatedEndpoint.id ? updatedEndpoint : ep)
    }));
    logger.info(`Updated Endpoint: ${updatedEndpoint.route}`);
  };

  const handleUpdateTaxonomy = (updatedTaxonomy: Taxonomy) => {
    setProject(prev => ({
      ...prev,
      taxonomies: prev.taxonomies.map(t => t.id === updatedTaxonomy.id ? updatedTaxonomy : t)
    }));
    logger.info(`Updated Taxonomy: ${updatedTaxonomy.slug}`);
  };

  const handleAddResource = () => {
    const newId = `cpt_${Date.now()}`;
    const newCpt: CustomPostType = {
      id: newId,
      slug: 'new_type',
      singularName: 'New Type',
      pluralName: 'New Types',
      description: '',
      icon: 'admin-post',
      supports: ['title', 'editor'],
      taxonomies: [],
      metaFields: [],
      showInRest: true,
      restBase: 'new_types'
    };
    setProject(prev => ({ ...prev, postTypes: [...prev.postTypes, newCpt] }));
    setEditingResource({ type: 'postType', id: newId });
    logger.success('Added new Post Type');
  };
  
  const handleAddEndpoint = () => {
    const newId = `endpoint_${Date.now()}`;
    const newEndpoint: CustomEndpoint = {
       id: newId,
       route: '/new-route',
       method: 'POST',
       callbackFunction: 'my_callback_function',
       description: 'New custom endpoint',
       parameters: []
    };
    setProject(prev => ({ ...prev, customEndpoints: [...prev.customEndpoints, newEndpoint] }));
    setEditingResource({ type: 'endpoint', id: newId });
    logger.success('Added new Endpoint');
  };

  const handleAddTaxonomy = () => {
    const newId = `tax_${Date.now()}`;
    const newTax: Taxonomy = {
      id: newId,
      slug: 'new_tax',
      singularName: 'New Taxonomy',
      pluralName: 'New Taxonomies',
      hierarchical: true,
      showInRest: true,
      connectedPostTypes: []
    };
    setProject(prev => ({ ...prev, taxonomies: [...prev.taxonomies, newTax] }));
    setEditingResource({ type: 'taxonomy', id: newId });
    logger.success('Added new Taxonomy');
  };

  const handleDeleteResource = (id: string) => {
    setProject(prev => ({
      ...prev,
      postTypes: prev.postTypes.filter(pt => pt.id !== id)
    }));
    if (editingResource?.id === id) setEditingResource(null);
    logger.info(`Deleted Resource ID: ${id}`);
  };
  
  const handleDeleteEndpoint = (id: string) => {
    setProject(prev => ({
      ...prev,
      customEndpoints: prev.customEndpoints.filter(ep => ep.id !== id)
    }));
    if (editingResource?.id === id) setEditingResource(null);
    logger.info(`Deleted Endpoint ID: ${id}`);
  };

  const handleDeleteTaxonomy = (id: string) => {
    setProject(prev => ({
      ...prev,
      taxonomies: prev.taxonomies.filter(t => t.id !== id)
    }));
    if (editingResource?.id === id) setEditingResource(null);
    logger.info(`Deleted Taxonomy ID: ${id}`);
  };

  const handleDuplicate = (type: ResourceType, id: string) => {
    if (type === 'postType') {
       const original = project.postTypes.find(pt => pt.id === id);
       if (original) {
         const newId = `cpt_${Date.now()}`;
         const copy = { ...original, id: newId, slug: `${original.slug}_copy`, singularName: `${original.singularName} Copy`, pluralName: `${original.pluralName} Copy` };
         setProject(prev => ({ ...prev, postTypes: [...prev.postTypes, copy] }));
         setEditingResource({ type: 'postType', id: newId });
         logger.success(`Duplicated Post Type: ${original.slug}`);
       }
    } else if (type === 'endpoint') {
      const original = project.customEndpoints.find(ep => ep.id === id);
      if (original) {
        const newId = `endpoint_${Date.now()}`;
        const copy = { ...original, id: newId, route: `${original.route}-copy` };
        setProject(prev => ({ ...prev, customEndpoints: [...prev.customEndpoints, copy] }));
        setEditingResource({ type: 'endpoint', id: newId });
        logger.success(`Duplicated Endpoint: ${original.route}`);
      }
    } else if (type === 'taxonomy') {
      const original = project.taxonomies.find(t => t.id === id);
      if (original) {
        const newId = `tax_${Date.now()}`;
        const copy = { ...original, id: newId, slug: `${original.slug}_copy` };
        setProject(prev => ({ ...prev, taxonomies: [...prev.taxonomies, copy] }));
        setEditingResource({ type: 'taxonomy', id: newId });
        logger.success(`Duplicated Taxonomy: ${original.slug}`);
      }
    }
  };

  const handleConnect = (source: { type: ResourceType, id: string }, target: { type: ResourceType, id: string }) => {
    // 1. Link Endpoint -> CPT (Enable Storage)
    if (source.type === 'endpoint' && target.type === 'postType') {
      const endpoint = project.customEndpoints.find(ep => ep.id === source.id);
      const targetCpt = project.postTypes.find(pt => pt.id === target.id);
      
      if (endpoint && targetCpt) {
         const newStorage = {
            enabled: true,
            targetCptSlug: targetCpt.slug,
            fieldMapping: { ...endpoint.storage?.fieldMapping }
         };
         // Intelligent Auto-Mapping
         endpoint.parameters.forEach(param => {
             if (param.key === 'title' || param.key === 'name') newStorage.fieldMapping[param.key] = 'post_title';
             else if (param.key === 'content' || param.key === 'description' || param.key === 'body') newStorage.fieldMapping[param.key] = 'post_content';
             else {
                 const match = targetCpt.metaFields.find(mf => mf.key === param.key);
                 if (match) newStorage.fieldMapping[param.key] = match.key;
             }
         });
         handleUpdateEndpoint({ ...endpoint, storage: newStorage });
         logger.success(`Linked Route ${endpoint.route} to Model ${targetCpt.singularName}`);
      }
    }
    // 2. Link CPT -> CPT (Create Relationship Field)
    if (source.type === 'postType' && target.type === 'postType' && source.id !== target.id) {
       const sourceCpt = project.postTypes.find(pt => pt.id === source.id);
       const targetCpt = project.postTypes.find(pt => pt.id === target.id);
       if (sourceCpt && targetCpt) {
          const existing = sourceCpt.metaFields.find(f => f.type === FieldType.RELATIONSHIP && f.targetPostType === targetCpt.slug);
          
          if (!existing) {
             const newField: MetaField = {
                id: `field_${Date.now()}`,
                key: `${targetCpt.slug}_id`,
                label: `Related ${targetCpt.singularName}`,
                type: FieldType.RELATIONSHIP,
                description: `Link to a ${targetCpt.singularName}`,
                required: false,
                showInRest: true,
                targetPostType: targetCpt.slug
             };
             handleUpdateResource({
                ...sourceCpt,
                metaFields: [...sourceCpt.metaFields, newField]
             });
             logger.success(`Created Relationship: ${sourceCpt.singularName} -> ${targetCpt.singularName}`);
          }
           
          // Bidirectional
          const reverseExisting = targetCpt.metaFields.find(f => f.type === FieldType.RELATIONSHIP && f.targetPostType === sourceCpt.slug);
          if (!reverseExisting) {
            const reverseField: MetaField = {
               id: `field_${Date.now()}`,
               key: `${sourceCpt.slug}_id`,
               label: `Related ${sourceCpt.singularName}`,
               type: FieldType.RELATIONSHIP,
               description: `Link to a ${sourceCpt.singularName}`,
               required: false,
               showInRest: true,
               targetPostType: sourceCpt.slug
            };
            handleUpdateResource({
               ...targetCpt,
               metaFields: [...targetCpt.metaFields, reverseField]
            });
            logger.success(`Created Bidirectional Relationship: ${targetCpt.singularName} -> ${sourceCpt.singularName}`);
          }
       }
    }
  };

  const handleAIApply = (partial: Partial<ProjectState>) => {
    setProject(prev => ({
      ...prev,
      postTypes: [...prev.postTypes, ...(partial.postTypes || [])],
      taxonomies: [...prev.taxonomies, ...(partial.taxonomies || [])],
      customEndpoints: [...prev.customEndpoints, ...(partial.customEndpoints || [])]
    }));
    logger.success('Applied AI generated structure');
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
  };
  
  const handleSelect = (type: ResourceType, id: string) => {
    setEditingResource({ type, id });
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'openapi':
        return <CodePreview project={project} initialTab="openapi" />;
      case 'php':
        return <CodePreview project={project} initialTab="php" />;
      case 'playground':
        return <CodePreview project={project} initialTab="playground" />;
      case 'flow':
        return (
           <FlowDesigner 
             project={project} 
             onSelect={handleSelect}
             onDelete={(type, id) => {
               if (type === 'postType') handleDeleteResource(id);
               else if (type === 'endpoint') handleDeleteEndpoint(id);
               else if (type === 'taxonomy') handleDeleteTaxonomy(id);
             }}
             onDuplicate={handleDuplicate}
             onAdd={(type) => {
               if (type === 'postType') handleAddResource();
               else if (type === 'endpoint') handleAddEndpoint();
               else if (type === 'taxonomy') handleAddTaxonomy();
               else if (type === 'helper') handleAddHelper();
             }}
             onConnect={handleConnect}
           />
        );
      case 'blueprint':
        return <BlueprintView project={project} />;
      case 'settings':
        return <SettingsScreen settings={settings} onSave={setSettings} project={project} setProject={setProject} />;
      case 'code':
        return (
          <GlobalLogicEditor 
            project={project}
            onUpdate={handleUpdateHelper}
            onAdd={handleAddHelper}
            onDelete={handleDeleteHelper}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
             <div className="p-8 bg-zinc-900/50 rounded-full mb-4">
               <LayoutTemplate size={48} className="text-zinc-700" />
             </div>
             <p className="text-lg font-medium mb-2">Welcome to WP API Architect</p>
             <p className="text-sm">Quick editing is available via sidebar or visual designers.</p>
          </div>
        );
    }
  };

  const editingCpt = editingResource?.type === 'postType' ? project.postTypes.find(pt => pt.id === editingResource.id) : null;
  const editingEndpoint = editingResource?.type === 'endpoint' ? project.customEndpoints.find(ep => ep.id === editingResource.id) : null;
  const editingTaxonomy = editingResource?.type === 'taxonomy' ? project.taxonomies.find(t => t.id === editingResource.id) : null;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      <Sidebar 
        project={project}
        currentView={currentView}
        selection={editingResource || { type: 'postType', id: '' }}
        isTerminalOpen={isTerminalOpen}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        onSelect={handleSelect}
        onViewChange={handleViewChange}
        onAddResource={handleAddResource}
        onAddEndpoint={handleAddEndpoint}
        onAddTaxonomy={handleAddTaxonomy}
        onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
        onOpenAI={() => setAIModalOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 pointer-events-none opacity-50 z-0"/>
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
           {renderMainContent()}
        </div>
        {isTerminalOpen && <Terminal onClose={() => setIsTerminalOpen(false)} />}
      </div>

      {/* Editor Modal Overlay */}
      <EditorModal 
        isOpen={!!editingResource} 
        onClose={() => setEditingResource(null)}
        title={
          editingCpt ? `Edit Model: ${editingCpt.singularName}` : 
          editingEndpoint ? `Edit Route: ${editingEndpoint.route}` : 
          editingTaxonomy ? `Edit Taxonomy: ${editingTaxonomy.singularName}` : 
          "Editor"
        }
      >
        {editingCpt && (
          <ResourceEditor 
            cpt={editingCpt} 
            allTaxonomies={project.taxonomies}
            allPostTypes={project.postTypes}
            onChange={handleUpdateResource}
            onDelete={() => handleDeleteResource(editingCpt.id)}
          />
        )}
        {editingEndpoint && (
          <EndpointEditor
            endpoint={editingEndpoint}
            namespace={project.namespace}
            postTypes={project.postTypes}
            globalHelpers={project.globalHelpers}
            onChange={handleUpdateEndpoint}
            onDelete={() => handleDeleteEndpoint(editingEndpoint.id)}
          />
        )}
        {editingTaxonomy && (
          <TaxonomyEditor
            taxonomy={editingTaxonomy}
            postTypes={project.postTypes}
            onChange={handleUpdateTaxonomy}
            onDelete={() => handleDeleteTaxonomy(editingTaxonomy.id)}
          />
        )}
      </EditorModal>

      {isAIModalOpen && (
        <AIAssistant 
          project={project}
          settings={settings}
          onApply={handleAIApply} 
          onClose={() => setAIModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
