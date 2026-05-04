import React from 'react';
import { CustomEndpoint, EndpointMethod, EndpointParameter, CustomPostType } from '../types';
import { Trash2, Settings, Plus, Network, Database, ArrowRight, Code } from 'lucide-react';
import { CodeEditor } from './CodeEditor';

interface EndpointEditorProps {
  endpoint: CustomEndpoint;
  namespace: string;
  postTypes: CustomPostType[];
  onChange: (updated: CustomEndpoint) => void;
  onDelete: () => void;
}

export const EndpointEditor: React.FC<EndpointEditorProps> = ({ endpoint, namespace, postTypes, onChange, onDelete }) => {
  
  const handleParamChange = (id: string, changes: Partial<EndpointParameter>) => {
    const updatedParams = endpoint.parameters.map(p => p.id === id ? { ...p, ...changes } : p);
    onChange({ ...endpoint, parameters: updatedParams });
  };

  const addParam = () => {
    const newParam: EndpointParameter = {
      id: `param_${Date.now()}`,
      key: 'new_param',
      type: 'string',
      required: false,
      description: ''
    };
    onChange({ ...endpoint, parameters: [...endpoint.parameters, newParam] });
  };

  const removeParam = (id: string) => {
    onChange({ ...endpoint, parameters: endpoint.parameters.filter(p => p.id !== id) });
  };

  const handleStorageToggle = (enabled: boolean) => {
    // Default to first available CPT if enabling
    const defaultSlug = endpoint.storage?.targetCptSlug || (postTypes[0]?.slug || '');
    
    // Trigger auto-map immediately if enabling
    let initialMapping: Record<string, string> = endpoint.storage?.fieldMapping || {};
    
    // Only auto-map if mapping is empty to avoid overwriting existing config on toggle
    if (enabled && Object.keys(initialMapping).length === 0 && defaultSlug) {
        initialMapping = generateAutoMapping(defaultSlug);
    }

    onChange({
      ...endpoint,
      storage: {
        enabled,
        targetCptSlug: defaultSlug,
        fieldMapping: initialMapping
      }
    });
  };

  const generateAutoMapping = (cptSlug: string): Record<string, string> => {
    const target = postTypes.find(pt => pt.slug === cptSlug);
    const newMapping: Record<string, string> = {};

    if (target) {
        endpoint.parameters.forEach(param => {
            const pKey = param.key.toLowerCase();
            
            // 1. Native WP Field Heuristics
            if (['title', 'name', 'subject', 'headline', 'label'].includes(pKey)) {
                newMapping[param.key] = 'post_title';
                return;
            } 
            if (['content', 'body', 'description', 'message', 'text', 'bio'].includes(pKey)) {
                newMapping[param.key] = 'post_content';
                return;
            }

            // 2. Exact Meta Field Match
            const exactMatch = target.metaFields.find(mf => mf.key === param.key);
            if (exactMatch) {
                newMapping[param.key] = exactMatch.key;
                return;
            }

            // 3. Fuzzy / Smart Meta Match (Enhanced)
            // e.g. param 'email' -> meta 'user_email' or 'contact_email'
            // e.g. param 'url' -> meta 'website_url'
            const fuzzyMatch = target.metaFields.find(mf => {
                const mKey = mf.key.toLowerCase();
                // Check for common suffixes/prefixes (e.g. user_email matching email)
                if (mKey.endsWith(`_${pKey}`) || mKey.startsWith(`${pKey}_`)) return true;
                // Check if param key is substantially inside meta key (e.g. email in contact_email)
                if (pKey.length > 3 && mKey.includes(pKey)) return true;
                return false;
            });
            
            if (fuzzyMatch) {
                newMapping[param.key] = fuzzyMatch.key;
            }
        });
    }
    return newMapping;
  };

  const handleTargetCptChange = (newSlug: string) => {
      const newMapping = generateAutoMapping(newSlug);
      onChange({
          ...endpoint,
          storage: {
              ...endpoint.storage!,
              targetCptSlug: newSlug,
              fieldMapping: newMapping
          }
      });
  };

  const handleMappingChange = (paramKey: string, metaKey: string) => {
    if (!endpoint.storage) return;
    const newMapping = { ...endpoint.storage.fieldMapping };
    
    // Explicitly handle 'None' by removing the key
    if (metaKey === '' || metaKey === '(None)') {
      delete newMapping[paramKey];
    } else {
      newMapping[paramKey] = metaKey;
    }
    
    onChange({
      ...endpoint,
      storage: {
        ...endpoint.storage,
        fieldMapping: newMapping
      }
    });
  };

  const [mappingModalOpen, setMappingModalOpen] = React.useState(false);

  const methods: EndpointMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const targetCpt = postTypes.find(pt => pt.slug === endpoint.storage?.targetCptSlug);

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center border border-pink-500/20">
              <Network className="text-pink-500" size={24} />
           </div>
           <div>
             <h2 className="text-2xl font-bold text-white tracking-tight font-mono">{endpoint.route}</h2>
             <p className="text-zinc-500 text-sm">Endpoint Configuration</p>
           </div>
        </div>
        <button 
          onClick={onDelete}
          className="text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-transparent hover:border-red-500/20"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-2 space-y-8">
          
           {/* Basic Info */}
           <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Route Settings</h3>
              
              <div className="grid grid-cols-2 gap-6">
                 <div className="col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold mb-1 block flex justify-between">
                      <span>ROUTE PATH</span>
                      <button 
                        onClick={() => onChange({...endpoint, route: endpoint.route + '/(?P<id>\\d+)'})}
                        className="text-pink-400 hover:text-pink-300 transition-colors"
                      >
                        + Add Dynamic ID (Regex)
                      </button>
                    </label>
                    <div className="flex items-center">
                        <span className="bg-zinc-900 border border-r-0 border-zinc-700 text-zinc-400 px-3 py-2 rounded-l text-sm font-mono">/{namespace}/</span>
                        <input 
                            type="text" 
                            value={endpoint.route.startsWith('/') ? endpoint.route.substring(1) : endpoint.route} 
                            onChange={e => onChange({...endpoint, route: '/' + e.target.value})}
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-r px-3 py-2 text-white font-mono text-sm focus:border-pink-500 outline-none"
                        />
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] text-zinc-500 font-bold mb-2 block">HTTP METHOD</label>
                    <div className="flex flex-wrap gap-2">
                        {methods.map(m => (
                            <button
                            key={m}
                            onClick={() => onChange({ ...endpoint, method: m })}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all border ${endpoint.method === m 
                                ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                            >
                            {m}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className="col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold mb-1 block">CALLBACK FUNCTION</label>
                    <input 
                        type="text" 
                        value={endpoint.callbackFunction} 
                        onChange={e => onChange({...endpoint, callbackFunction: e.target.value})}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white font-mono text-xs focus:border-pink-500 outline-none"
                    />
                 </div>
                 
                 <div className="col-span-2">
                    <label className="text-[10px] text-zinc-500 font-bold mb-1 block">DESCRIPTION</label>
                    <input 
                        type="text" 
                        value={endpoint.description} 
                        onChange={e => onChange({...endpoint, description: e.target.value})}
                        placeholder="What does this endpoint do?"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white text-xs focus:border-pink-500 outline-none"
                    />
                 </div>
              </div>
           </div>

           {/* Parameters */}
           <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Input Parameters</h3>
                 <button 
                    onClick={addParam}
                    className="flex items-center gap-1.5 text-xs bg-pink-600 hover:bg-pink-500 text-white px-3 py-1.5 rounded-full transition-all shadow-lg shadow-pink-900/20 font-medium"
                 >
                    <Plus size={14} /> Add Parameter
                 </button>
              </div>

              <div className="space-y-2">
                 {endpoint.parameters.length === 0 && (
                     <div className="text-center py-8 bg-zinc-900/30 rounded border border-dashed border-zinc-800">
                         <span className="text-xs text-zinc-600">No parameters defined.</span>
                     </div>
                 )}
                 {endpoint.parameters.map((param) => (
                    <div key={param.id} className="grid grid-cols-12 gap-3 items-center bg-zinc-900/50 p-2 rounded border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                        <div className="col-span-3">
                            <input 
                                type="text" placeholder="key" value={param.key} onChange={e => handleParamChange(param.id, { key: e.target.value })}
                                className="w-full bg-transparent text-xs text-pink-300 font-mono focus:outline-none placeholder-zinc-700"
                            />
                        </div>
                        <div className="col-span-2">
                            <select value={param.type} onChange={e => handleParamChange(param.id, { type: e.target.value })} className="bg-zinc-800 text-xs text-zinc-400 rounded px-1 py-0.5 border-none outline-none">
                                <option value="string">string</option>
                                <option value="integer">integer</option>
                                <option value="boolean">boolean</option>
                            </select>
                        </div>
                        <div className="col-span-5">
                            <input type="text" placeholder="Description..." value={param.description} onChange={e => handleParamChange(param.id, { description: e.target.value })} className="w-full bg-transparent text-xs text-zinc-500 focus:outline-none placeholder-zinc-800"/>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-3">
                            <input type="checkbox" checked={param.required} onChange={e => handleParamChange(param.id, { required: e.target.checked })} className="rounded bg-zinc-800 border-zinc-700 text-pink-500 w-3 h-3"/>
                            <button onClick={() => removeParam(param.id)} className="text-zinc-600 hover:text-red-400"><Trash2 size={12} /></button>
                        </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Custom PHP */}
           <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                 <Code size={14} /> Custom Logic
              </h3>
              <CodeEditor 
                value={endpoint.customPhp || ''}
                onChange={(val) => onChange({...endpoint, customPhp: val})}
                parameters={endpoint.parameters}
                targetCptSlug={endpoint.storage?.enabled ? endpoint.storage.targetCptSlug : undefined}
                postTypes={postTypes}
              />
           </div>

        </div>

        {/* Right Column: Flow Logic */}
        <div className="space-y-6">
            
            {/* Hooks */}
            <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Hooks & Actions</h3>
                <div>
                    <label className="text-[10px] text-zinc-500 font-bold mb-1 block">WP ACTION HOOK</label>
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-600 font-mono text-xs">do_action('</span>
                        <input 
                            type="text" 
                            value={endpoint.hookName || ''} 
                            onChange={e => onChange({...endpoint, hookName: e.target.value})}
                            placeholder="my_action"
                            className="bg-transparent border-b border-zinc-700 text-yellow-400 font-mono text-xs focus:outline-none focus:border-yellow-500 px-1 py-0.5 w-full"
                        />
                        <span className="text-zinc-600 font-mono text-xs">')</span>
                    </div>
                </div>
            </div>

            {/* Storage Automator */}
            <div className={`bg-[#121214] border transition-all rounded-xl p-5 shadow-sm relative overflow-hidden ${endpoint.storage?.enabled ? 'border-green-500/30' : 'border-zinc-800'}`}>
                 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                     <Database size={80} />
                 </div>
                 
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Storage Automator</h3>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={endpoint.storage?.enabled || false}
                        onChange={e => handleStorageToggle(e.target.checked)}
                        />
                        <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-600 peer-checked:after:bg-white"></div>
                    </label>
                 </div>

                 {endpoint.storage?.enabled ? (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                         <div>
                            <label className="text-[10px] text-zinc-500 font-bold mb-1 block">TARGET MODEL</label>
                            <select
                                value={endpoint.storage.targetCptSlug}
                                onChange={e => handleTargetCptChange(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                            >
                                {postTypes.map(pt => (
                                    <option key={pt.slug} value={pt.slug}>{pt.singularName}</option>
                                ))}
                            </select>
                         </div>

                         {targetCpt && (
                             <div className="bg-zinc-900/50 rounded p-3 border border-zinc-800">
                                 <div className="flex justify-between items-center mb-2">
                                     <p className="text-[10px] text-zinc-400 font-bold uppercase">Field Mapping</p>
                                     <button 
                                        onClick={() => setMappingModalOpen(true)}
                                        className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20 hover:bg-green-500/20 transition-colors"
                                     >
                                        Edit Mapping
                                     </button>
                                 </div>
                                 <div className="space-y-1">
                                    {endpoint.parameters.map(param => {
                                        const mappedTo = endpoint.storage?.fieldMapping[param.key];
                                        return (
                                        <div key={param.id} className="flex items-center justify-between gap-2 bg-zinc-800/30 px-2 py-1 rounded">
                                            <span className="text-[10px] font-mono text-pink-300 truncate w-1/2">{param.key}</span>
                                            <ArrowRight size={10} className="text-zinc-600 shrink-0" />
                                            <span className="text-[10px] text-zinc-400 truncate w-1/2 text-right">
                                                {mappedTo ? mappedTo : <span className="text-zinc-600 italic">None</span>}
                                            </span>
                                        </div>
                                    )})}
                                 </div>
                             </div>
                         )}
                     </div>
                 ) : (
                     <p className="text-[10px] text-zinc-600 leading-relaxed">
                        Enable to automatically map incoming parameters to a Custom Post Type without writing PHP.
                     </p>
                 )}
            </div>

        </div>

      </div>

      {/* Field Mapping Modal */}
      {mappingModalOpen && targetCpt && endpoint.storage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMappingModalOpen(false)} />
           <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                  <div>
                    <h3 className="font-bold text-white tracking-tight">Field Mapping</h3>
                    <p className="text-xs text-zinc-500">Map endpoint parameters to {targetCpt.singularName} fields</p>
                  </div>
                  <button onClick={() => setMappingModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                      <Trash2 size={16} className="hidden" />
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-2 px-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase">Parameter</span>
                      <span />
                      <span className="text-xs font-bold text-zinc-500 uppercase">CPT Field</span>
                  </div>
                  {endpoint.parameters.map(param => (
                      <div key={param.id} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                          <span className="text-sm font-mono text-pink-300 px-2 truncate" title={param.key}>{param.key}</span>
                          <ArrowRight size={14} className="text-zinc-600" />
                          <select
                              value={endpoint.storage?.fieldMapping[param.key] || ''}
                              onChange={e => handleMappingChange(param.key, e.target.value)}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                          >
                              <option value="">(None)</option>
                              <optgroup label="Standard Fields">
                                <option value="post_title">Post Title</option>
                                <option value="post_content">Post Content</option>
                              </optgroup>
                              {targetCpt.metaFields.length > 0 && (
                                  <optgroup label="Custom Meta Fields">
                                      {targetCpt.metaFields.map(mf => (
                                          <option key={mf.key} value={mf.key}>{mf.key}</option>
                                      ))}
                                  </optgroup>
                              )}
                          </select>
                      </div>
                  ))}
                  {endpoint.parameters.length === 0 && (
                      <div className="text-center py-8 text-zinc-500 text-sm border border-zinc-800 border-dashed rounded-lg">
                          No parameters available to map.
                      </div>
                  )}
              </div>
              <div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-900/50">
                  <button onClick={() => setMappingModalOpen(false)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors">
                      Done
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};