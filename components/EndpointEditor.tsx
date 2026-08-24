import React, { useState } from 'react';
import { CustomEndpoint, EndpointMethod, EndpointParameter, CustomPostType, GlobalHelper, EndpointMiddleware } from '../types';
import { Trash2, Settings, Plus, Network, Database, ArrowRight, Code, ShieldCheck, Lock, Key, Clock, Shield, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { SnippetLibraryModal } from './SnippetLibraryModal';

interface EndpointEditorProps {
  endpoint: CustomEndpoint;
  namespace: string;
  postTypes: CustomPostType[];
  globalHelpers: GlobalHelper[];
  onChange: (updated: CustomEndpoint) => void;
  onDelete: () => void;
}

const MIDDLEWARE_PRESETS: { type: EndpointMiddleware['type']; name: string; description: string; snippet: string }[] = [
  {
    type: 'auth',
    name: 'Require User Login (is_user_logged_in)',
    description: 'Ensures requester is authenticated via WordPress session or REST auth',
    snippet: `if ( ! is_user_logged_in() ) {\n    return new WP_Error( 'rest_unauthorized', 'You must be logged in to access this endpoint.', array( 'status' => 401 ) );\n}`
  },
  {
    type: 'permission',
    name: 'Check Capability (manage_options)',
    description: 'Restricts endpoint execution to users with Administrator capability',
    snippet: `if ( ! current_user_can( 'manage_options' ) ) {\n    return new WP_Error( 'rest_forbidden', 'Insufficient user privileges.', array( 'status' => 403 ) );\n}`
  },
  {
    type: 'auth',
    name: 'Verify REST Nonce Header',
    description: 'Validates X-WP-Nonce header token against REST API session',
    snippet: `$nonce = $request->get_header( 'x_wp_nonce' );\nif ( ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {\n    return new WP_Error( 'rest_cookie_invalid_nonce', 'Invalid security nonce provided.', array( 'status' => 403 ) );\n}`
  },
  {
    type: 'rate_limit',
    name: 'IP Rate Limiting (60 req/min)',
    description: 'Prevents brute force abuse using temporary WP transients per IP',
    snippet: `$ip = $_SERVER['REMOTE_ADDR'];\n$transient_key = 'rl_' . md5($ip);\n$hits = get_transient( $transient_key ) ?: 0;\nif ( $hits >= 60 ) {\n    return new WP_Error( 'rate_limit_exceeded', 'Rate limit exceeded. Please wait a minute.', array( 'status' => 429 ) );\n}\nset_transient( $transient_key, $hits + 1, 60 );`
  },
  {
    type: 'custom',
    name: 'Custom Pre-Callback Routine',
    description: 'Write custom PHP pre-callback verification logic',
    snippet: `// Custom Pre-callback logic\n$api_key = $request->get_header( 'x_api_key' );\nif ( empty($api_key) ) {\n    return new WP_Error( 'invalid_api_key', 'API key missing in header.', array( 'status' => 401 ) );\n}`
  }
];

export const EndpointEditor: React.FC<EndpointEditorProps> = ({ endpoint, namespace, postTypes, globalHelpers, onChange, onDelete }) => {
  const [editingMwId, setEditingMwId] = useState<string | null>(null);
  const [activeMwSnippetModalId, setActiveMwSnippetModalId] = useState<string | null>(null);

  const addMiddlewarePreset = (preset: typeof MIDDLEWARE_PRESETS[0]) => {
    const newMw: EndpointMiddleware = {
      id: `mw_${Date.now()}_${Math.random().toString(36).substring(2,6)}`,
      name: preset.name,
      type: preset.type,
      enabled: true,
      callbackSnippet: preset.snippet,
      description: preset.description
    };
    const current = endpoint.middlewares || [];
    onChange({ ...endpoint, middlewares: [...current, newMw] });
  };

  const toggleMiddleware = (id: string) => {
    const current = endpoint.middlewares || [];
    onChange({
      ...endpoint,
      middlewares: current.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
    });
  };

  const removeMiddleware = (id: string) => {
    const current = endpoint.middlewares || [];
    onChange({
      ...endpoint,
      middlewares: current.filter(m => m.id !== id)
    });
  };

  const updateMiddleware = (id: string, updates: Partial<EndpointMiddleware>) => {
    const current = endpoint.middlewares || [];
    onChange({
      ...endpoint,
      middlewares: current.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };
  
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
            if (['content', 'body', 'description', 'message', 'text', 'bio', 'excerpt', 'summary'].includes(pKey)) {
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
            const fuzzyMatch = target.metaFields.find(mf => {
                const mKey = mf.key.toLowerCase();
                // Check for common suffixes/prefixes
                if (mKey.endsWith(`_${pKey}`) || mKey.startsWith(`${pKey}_`)) return true;
                // Check matches for email, phone, url, etc.
                if (pKey === 'email' && mKey.includes('email')) return true;
                if (pKey === 'phone' && (mKey.includes('phone') || mKey.includes('tel'))) return true;
                if (pKey === 'url' && (mKey.includes('url') || mKey.includes('link'))) return true;
                // Check partial match
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
  
  const regenerateMapping = () => {
    if (endpoint.storage?.targetCptSlug) {
      const newMapping = generateAutoMapping(endpoint.storage.targetCptSlug);
      onChange({
        ...endpoint,
        storage: {
          ...endpoint.storage,
          fieldMapping: newMapping
        }
      });
    }
  };

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

           {/* Middleware (Pre-Callback Verification Routines) */}
           <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                       <ShieldCheck size={16} className="text-indigo-400" /> Middleware & Pre-Callback Routines
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">
                       Authentication, permission verification, and rate limiting routines executed prior to main endpoint handler.
                    </p>
                 </div>
              </div>

              {/* Presets Row */}
              <div className="mb-6">
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Quick Presets</p>
                 <div className="flex flex-wrap gap-2">
                    {MIDDLEWARE_PRESETS.map((preset, idx) => (
                       <button
                          key={idx}
                          onClick={() => addMiddlewarePreset(preset)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 hover:border-indigo-500/50 text-xs text-zinc-300 hover:text-white transition-all"
                       >
                          <Plus size={12} className="text-indigo-400" />
                          <span>{preset.name.split('(')[0]}</span>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Active Middlewares List */}
              <div className="space-y-3">
                 {(!endpoint.middlewares || endpoint.middlewares.length === 0) && (
                    <div className="text-center py-6 bg-zinc-900/30 rounded border border-dashed border-zinc-800 text-xs text-zinc-500">
                       No middleware routines configured. Click a quick preset above to add authentication or rate limiting checks.
                    </div>
                 )}

                 {endpoint.middlewares?.map((mw) => {
                    const isEditing = editingMwId === mw.id;
                    return (
                       <div key={mw.id} className={`rounded-lg border transition-all ${mw.enabled ? 'bg-zinc-900/60 border-indigo-500/30' : 'bg-zinc-900/20 border-zinc-800 opacity-60'}`}>
                          <div className="p-3 flex items-center justify-between gap-3">
                             <div className="flex items-center gap-3 flex-1 min-w-0">
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                   <input 
                                      type="checkbox" 
                                      checked={mw.enabled} 
                                      onChange={() => toggleMiddleware(mw.id)} 
                                      className="sr-only peer"
                                   />
                                   <div className="w-7 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                                </label>

                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2">
                                      <input 
                                         type="text" 
                                         value={mw.name} 
                                         onChange={e => updateMiddleware(mw.id, { name: e.target.value })}
                                         className="bg-transparent font-medium text-xs text-zinc-200 focus:outline-none focus:border-b focus:border-indigo-500 truncate"
                                      />
                                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                                         mw.type === 'auth' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                         mw.type === 'permission' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                         mw.type === 'rate_limit' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                         'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                      }`}>
                                         {mw.type}
                                      </span>
                                   </div>
                                   {mw.description && <p className="text-[10px] text-zinc-500 truncate mt-0.5">{mw.description}</p>}
                                </div>
                             </div>

                             <div className="flex items-center gap-2">
                                <button 
                                   onClick={() => setEditingMwId(isEditing ? null : mw.id)} 
                                   className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 flex items-center gap-1"
                                >
                                   {isEditing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                   <span>{isEditing ? 'Close' : 'PHP Logic'}</span>
                                </button>
                                <button 
                                   onClick={() => removeMiddleware(mw.id)} 
                                   className="text-zinc-500 hover:text-red-400 p-1"
                                >
                                   <Trash2 size={14} />
                                </button>
                             </div>
                          </div>

                          {isEditing && (
                             <div className="p-3 border-t border-zinc-800/80 bg-black/40 space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Pre-Callback PHP Logic</label>
                                  <button
                                    type="button"
                                    onClick={() => setActiveMwSnippetModalId(mw.id)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 px-2 py-0.5 rounded transition-colors"
                                  >
                                    <Sparkles size={11} className="text-amber-300" />
                                    <span>Insert Snippet</span>
                                  </button>
                                </div>
                                <textarea
                                   value={mw.callbackSnippet}
                                   onChange={e => updateMiddleware(mw.id, { callbackSnippet: e.target.value })}
                                   rows={5}
                                   className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-green-400 focus:outline-none focus:border-indigo-500"
                                   placeholder="// Return true or WP_Error"
                                />
                             </div>
                          )}
                       </div>
                    );
                 })}
              </div>
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

      {/* Custom PHP - Full Width */}
      <div className="mt-8 space-y-2">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Code size={14} /> Custom Logic
        </h3>
        <CodeEditor 
          value={endpoint.customPhp || ''}
          onChange={(val) => onChange({...endpoint, customPhp: val})}
          parameters={endpoint.parameters}
          targetCptSlug={endpoint.storage?.enabled ? endpoint.storage.targetCptSlug : undefined}
          postTypes={postTypes}
          globalHelpers={globalHelpers}
        />
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

      {/* Snippet Library Modal for Middleware */}
      {activeMwSnippetModalId && (
        <SnippetLibraryModal
          isOpen={true}
          onClose={() => setActiveMwSnippetModalId(null)}
          onInsert={(snippet) => {
            const mw = endpoint.middlewares?.find(m => m.id === activeMwSnippetModalId);
            if (mw) {
              const currentSnippet = mw.callbackSnippet || '';
              const newSnippet = currentSnippet ? `${currentSnippet}\n\n${snippet}` : snippet;
              updateMiddleware(activeMwSnippetModalId, { callbackSnippet: newSnippet });
            }
          }}
          scope="middleware"
        />
      )}
    </div>
  );
};