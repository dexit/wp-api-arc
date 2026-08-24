import React, { useState, useMemo } from 'react';
import { 
  CustomEndpoint, 
  EndpointMethod, 
  EndpointParameter, 
  CustomPostType, 
  GlobalHelper, 
  EndpointMiddleware,
  FieldType,
  EndpointParamType
} from '../types';
import { 
  Trash2, 
  Plus, 
  Network, 
  Database, 
  ArrowRight, 
  Code, 
  ShieldCheck, 
  Lock, 
  Key, 
  Clock, 
  Shield, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  FileJson, 
  HelpCircle, 
  Check, 
  Copy, 
  Variable, 
  Layers, 
  Box, 
  Braces, 
  Tag,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { SnippetLibraryModal } from './SnippetLibraryModal';
import { JsonPayloadImporterModal } from './JsonPayloadImporterModal';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';

interface EndpointEditorProps {
  endpoint: CustomEndpoint;
  namespace: string;
  postTypes: CustomPostType[];
  globalHelpers: GlobalHelper[];
  onChange: (updated: CustomEndpoint) => void;
  onDelete: () => void;
}

const PARAM_TYPE_DEFINITIONS: Record<string, { label: string; desc: string; sanitize: string; validate: string; color: string }> = {
  string: { label: 'String / Text', desc: 'Standard single-line text', sanitize: 'sanitize_text_field', validate: 'is_string', color: 'bg-zinc-800 text-zinc-300' },
  integer: { label: 'Integer', desc: 'Whole number integer (ID, count)', sanitize: 'absint', validate: 'is_numeric', color: 'bg-amber-500/20 text-amber-300' },
  number: { label: 'Number / Float', desc: 'Decimal or floating point (price, coordinates)', sanitize: 'floatval', validate: 'is_numeric', color: 'bg-amber-500/20 text-amber-300' },
  boolean: { label: 'Boolean', desc: 'True / false flag', sanitize: 'rest_sanitize_boolean', validate: 'is_bool', color: 'bg-indigo-500/20 text-indigo-300' },
  object: { label: 'JSON Object', desc: 'Nested dictionary/object payload', sanitize: 'rest_sanitize_value_from_schema', validate: 'rest_validate_request_arg', color: 'bg-purple-500/20 text-purple-300' },
  array: { label: 'Array / List', desc: 'List of items or IDs', sanitize: 'array_map', validate: 'is_array', color: 'bg-emerald-500/20 text-emerald-300' },
  email: { label: 'Email', desc: 'Valid email address with format verification', sanitize: 'sanitize_email', validate: 'is_email', color: 'bg-cyan-500/20 text-cyan-300' },
  url: { label: 'URL', desc: 'Valid web address / URI', sanitize: 'esc_url_raw', validate: 'filter_var(FILTER_VALIDATE_URL)', color: 'bg-blue-500/20 text-blue-300' },
  'date-time': { label: 'Date-Time (ISO)', desc: 'ISO 8601 formatted date/time string', sanitize: 'sanitize_text_field', validate: 'rest_validate_request_arg', color: 'bg-teal-500/20 text-teal-300' },
  enum: { label: 'Enum / Whitelist', desc: 'Restricted set of predefined option strings', sanitize: 'sanitize_text_field', validate: 'in_array', color: 'bg-rose-500/20 text-rose-300' },
  file: { label: 'File / Attachment', desc: 'Media attachment ID or upload reference', sanitize: 'absint', validate: 'is_numeric', color: 'bg-orange-500/20 text-orange-300' },
};

const MIDDLEWARE_PRESETS: { type: EndpointMiddleware['type']; name: string; description: string; snippet: string }[] = [
  {
    type: 'auth',
    name: 'Require User Login (is_user_logged_in)',
    description: 'Ensures requester is authenticated via WordPress session or REST token',
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
    type: 'auth',
    name: 'Bearer Token Header Check',
    description: 'Verifies Bearer token in Authorization header',
    snippet: `$auth_header = $request->get_header( 'authorization' );\nif ( empty( $auth_header ) || ! preg_match( '/Bearer\\s+(.*)$/i', $auth_header, $matches ) ) {\n    return new WP_Error( 'rest_forbidden', 'Missing or malformed Bearer Authorization token.', array( 'status' => 401 ) );\n}`
  },
  {
    type: 'rate_limit',
    name: 'IP Rate Limiting (60 req/min)',
    description: 'Prevents brute force abuse using temporary WP transients per IP',
    snippet: `$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';\n$transient_key = 'rl_' . md5( $ip );\n$hits = get_transient( $transient_key ) ?: 0;\nif ( $hits >= 60 ) {\n    return new WP_Error( 'rate_limit_exceeded', 'Rate limit exceeded. Please wait 60 seconds.', array( 'status' => 429 ) );\n}\nset_transient( $transient_key, $hits + 1, 60 );`
  },
  {
    type: 'custom',
    name: 'Custom Pre-Callback Routine',
    description: 'Write custom PHP pre-callback verification logic',
    snippet: `// Custom Pre-callback logic\n$api_key = $request->get_header( 'x_api_key' );\nif ( empty( $api_key ) ) {\n    return new WP_Error( 'invalid_api_key', 'API key missing in header.', array( 'status' => 401 ) );\n}`
  }
];

export const EndpointEditor: React.FC<EndpointEditorProps> = ({ 
  endpoint, 
  namespace, 
  postTypes, 
  globalHelpers, 
  onChange, 
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'middleware' | 'logic' | 'storage'>('params');
  const [editingMwId, setEditingMwId] = useState<string | null>(null);
  const [activeMwSnippetModalId, setActiveMwSnippetModalId] = useState<string | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [showTypeHelpModal, setShowTypeHelpModal] = useState(false);

  const methods: EndpointMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const targetCpt = postTypes.find(pt => pt.slug === endpoint.storage?.targetCptSlug);

  // Parameter Handlers
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

  const handleJsonImport = (importedParams: EndpointParameter[]) => {
    onChange({
      ...endpoint,
      parameters: [...endpoint.parameters, ...importedParams]
    });
  };

  // Middleware Handlers
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
    setEditingMwId(newMw.id);
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

  const moveMiddleware = (id: string, direction: 'up' | 'down') => {
    const current = [...(endpoint.middlewares || [])];
    const index = current.findIndex(m => m.id === id);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;
    onChange({ ...endpoint, middlewares: current });
  };

  // Storage & Smart Auto-Mapping
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

        // 3. Fuzzy / Semantic Match
        const fuzzyMatch = target.metaFields.find(mf => {
          const mKey = mf.key.toLowerCase();
          if (mKey.endsWith(`_${pKey}`) || mKey.startsWith(`${pKey}_`)) return true;
          if (pKey === 'email' && mKey.includes('email')) return true;
          if (pKey === 'phone' && (mKey.includes('phone') || mKey.includes('tel'))) return true;
          if (pKey === 'url' && (mKey.includes('url') || mKey.includes('link'))) return true;
          if (pKey === 'price' && (mKey.includes('price') || mKey.includes('cost') || mKey.includes('amount'))) return true;
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

  const handleStorageToggle = (enabled: boolean) => {
    const defaultSlug = endpoint.storage?.targetCptSlug || (postTypes[0]?.slug || '');
    let initialMapping: Record<string, string> = endpoint.storage?.fieldMapping || {};
    
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

  const activeMwsCount = (endpoint.middlewares || []).filter(m => m.enabled).length;

  return (
    <div className="h-full flex flex-col bg-[#0e0e11] text-zinc-100 overflow-hidden select-none">
      
      {/* Top Banner Header */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-[#121215] flex flex-wrap justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
            <Network size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold font-mono uppercase tracking-wider ${
                endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                endpoint.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                endpoint.method === 'PUT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                endpoint.method === 'DELETE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {endpoint.method}
              </span>
              <h2 className="text-lg font-bold font-mono text-white tracking-tight truncate">
                /{namespace}{endpoint.route}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {endpoint.description || `Custom endpoint handler: ${endpoint.callbackFunction}()`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={onDelete}
            className="text-red-400 hover:text-white hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold border border-red-500/20"
          >
            <Trash2 size={13} />
            <span>Delete Route</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="px-6 border-b border-zinc-800 bg-[#141418] flex items-center gap-2 shrink-0 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('params')}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'params' 
              ? 'border-pink-500 text-pink-400 bg-pink-500/5' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Variable size={14} />
          <span>Route & Parameters</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
            {endpoint.parameters.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('middleware')}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'middleware' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Middleware & Pre-Callback Pipeline</span>
          {activeMwsCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
              {activeMwsCount} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logic')}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'logic' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Code size={14} />
          <span>REST Callback PHP Logic</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'storage' 
              ? 'border-amber-500 text-amber-400 bg-amber-500/5' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Database size={14} />
          <span>Storage Automator & CPT Sync</span>
          {endpoint.storage?.enabled && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
              {endpoint.storage.targetCptSlug}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
        
        {/* ========================================================================= */}
        {/* TAB 1: ROUTE & PARAMETERS */}
        {/* ========================================================================= */}
        {activeTab === 'params' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
            
            {/* Route & Method Card */}
            <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>Route Definition</span>
                <button
                  type="button"
                  onClick={() => setShowTypeHelpModal(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-pink-400 hover:text-pink-300 bg-pink-950/40 hover:bg-pink-900/60 border border-pink-800/40 px-2 py-0.5 rounded transition-colors"
                >
                  <HelpCircle size={12} />
                  <span>Input Types Guide</span>
                </button>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Method Pills */}
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">HTTP METHOD</label>
                  <div className="flex flex-wrap gap-1.5">
                    {methods.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => onChange({ ...endpoint, method: m })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border ${
                          endpoint.method === m 
                            ? 'bg-pink-600 border-pink-500 text-white shadow-md shadow-pink-900/40' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Route Path Input */}
                <div className="md:col-span-8">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">REST ROUTE PATH</label>
                    <button 
                      type="button"
                      onClick={() => onChange({ ...endpoint, route: endpoint.route + '/(?P<id>\\d+)' })}
                      className="text-[11px] text-pink-400 hover:text-pink-300 font-mono transition-colors"
                    >
                      + Add Regex (?P&lt;id&gt;\d+)
                    </button>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-zinc-900 border border-r-0 border-zinc-700 text-zinc-400 px-3 py-2 rounded-l-lg text-xs font-mono">
                      /{namespace}/
                    </span>
                    <input 
                      type="text" 
                      value={endpoint.route.startsWith('/') ? endpoint.route.substring(1) : endpoint.route} 
                      onChange={e => onChange({ ...endpoint, route: '/' + e.target.value })}
                      className="flex-1 bg-zinc-900/90 border border-zinc-700 rounded-r-lg px-3 py-2 text-white font-mono text-xs focus:border-pink-500 outline-none"
                    />
                  </div>
                </div>

                {/* Callback Name */}
                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">PHP CALLBACK FUNCTION</label>
                  <input 
                    type="text" 
                    value={endpoint.callbackFunction} 
                    onChange={e => onChange({ ...endpoint, callbackFunction: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-pink-500 outline-none"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">DESCRIPTION / OPENAPI SUMMARY</label>
                  <input 
                    type="text" 
                    value={endpoint.description} 
                    onChange={e => onChange({ ...endpoint, description: e.target.value })}
                    placeholder="E.g., Process order submission and save customer records"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:border-pink-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Input Parameters & JSON Body Card */}
            <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5 shadow-xl">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    REST Input Parameters & Schema
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Defines request arguments with automatic WordPress sanitization & validation callbacks.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsJsonModalOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-pink-300 bg-pink-950/60 hover:bg-pink-900/80 border border-pink-800/60 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    <FileJson size={13} className="text-pink-400" />
                    <span>Import JSON Payload</span>
                  </button>
                  <button 
                    type="button"
                    onClick={addParam}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-500 px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-pink-900/30"
                  >
                    <Plus size={13} />
                    <span>Add Parameter</span>
                  </button>
                </div>
              </div>

              {endpoint.parameters.length === 0 ? (
                <div className="p-8 text-center bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 space-y-3">
                  <Variable size={28} className="mx-auto text-zinc-600" />
                  <p className="text-xs text-zinc-400 font-medium">No input parameters configured for this route.</p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={addParam}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                    >
                      + Add Single Parameter
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsJsonModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-pink-950/60 hover:bg-pink-900/80 text-pink-300 border border-pink-800/60 text-xs font-semibold"
                    >
                      Paste Sample JSON Payload
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-12 gap-3 px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <span className="col-span-3">Argument Key</span>
                    <span className="col-span-3">Input Type</span>
                    <span className="col-span-4">Description & Rules</span>
                    <span className="col-span-1 text-center">Req</span>
                    <span className="col-span-1 text-right">Action</span>
                  </div>

                  {endpoint.parameters.map((param) => {
                    const typeInfo = PARAM_TYPE_DEFINITIONS[param.type] || PARAM_TYPE_DEFINITIONS.string;
                    return (
                      <div 
                        key={param.id} 
                        className="grid grid-cols-12 gap-3 items-center bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                      >
                        {/* Param Key */}
                        <div className="col-span-3">
                          <input 
                            type="text" 
                            placeholder="field_key" 
                            value={param.key} 
                            onChange={e => handleParamChange(param.id, { key: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-pink-300 font-mono focus:border-pink-500 focus:outline-none placeholder-zinc-700"
                          />
                        </div>

                        {/* Param Type */}
                        <div className="col-span-3">
                          <select 
                            value={param.type} 
                            onChange={e => handleParamChange(param.id, { type: e.target.value })} 
                            className="w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2 py-1.5 focus:border-pink-500 focus:outline-none"
                          >
                            <option value="string">string (Text)</option>
                            <option value="integer">integer (Whole Number)</option>
                            <option value="number">number (Float / Decimal)</option>
                            <option value="boolean">boolean (True / False)</option>
                            <option value="object">object (JSON Object)</option>
                            <option value="array">array (List / Items)</option>
                            <option value="email">email (Sanitized Email)</option>
                            <option value="url">url (Valid Web URL)</option>
                            <option value="date-time">date-time (ISO 8601)</option>
                            <option value="enum">enum (Whitelist Options)</option>
                            <option value="file">file (Attachment ID)</option>
                          </select>
                        </div>

                        {/* Description / Schema */}
                        <div className="col-span-4 space-y-1">
                          <input 
                            type="text" 
                            placeholder="Description for API docs..." 
                            value={param.description} 
                            onChange={e => handleParamChange(param.id, { description: e.target.value })} 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:border-pink-500 focus:outline-none placeholder-zinc-700"
                          />
                          {param.type === 'enum' && (
                            <input 
                              type="text" 
                              placeholder="Allowed values: pending, active, completed" 
                              value={param.enumOptions ? param.enumOptions.join(', ') : ''} 
                              onChange={e => handleParamChange(param.id, { enumOptions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                              className="w-full bg-zinc-950 border border-rose-900/40 rounded px-2 py-1 text-[11px] font-mono text-rose-300 placeholder-zinc-600"
                            />
                          )}
                        </div>

                        {/* Required Checkbox */}
                        <div className="col-span-1 flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={param.required} 
                            onChange={e => handleParamChange(param.id, { required: e.target.checked })} 
                            className="rounded bg-zinc-950 border-zinc-700 text-pink-500 w-4 h-4 cursor-pointer"
                            title="Mark as required argument"
                          />
                        </div>

                        {/* Action */}
                        <div className="col-span-1 flex items-center justify-end">
                          <button 
                            type="button"
                            onClick={() => removeParam(param.id)} 
                            className="text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                            title="Remove parameter"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MIDDLEWARE & PRE-CALLBACK PIPELINE */}
        {/* ========================================================================= */}
        {activeTab === 'middleware' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
            
            {/* Presets Header */}
            <div className="bg-[#141418] border border-zinc-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-400" />
                  <span>Pre-Callback Middleware Pipeline</span>
                </h3>
                <span className="text-xs text-zinc-400">Executed sequentially before callback</span>
              </div>

              <p className="text-xs text-zinc-400 mb-4">
                Add guards to sanitize headers, verify capabilities, authenticate requests, or rate-limit IPs before executing the main REST logic.
              </p>

              <div className="flex flex-wrap gap-2">
                {MIDDLEWARE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addMiddlewarePreset(preset)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-indigo-500/60 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
                  >
                    <Plus size={12} className="text-indigo-400" />
                    <span>{preset.name.split('(')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Middleware Pipeline */}
            <div className="space-y-4">
              {(!endpoint.middlewares || endpoint.middlewares.length === 0) ? (
                <div className="p-8 text-center bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 space-y-2">
                  <Shield size={28} className="mx-auto text-zinc-600" />
                  <p className="text-xs text-zinc-400 font-medium">No middleware guards configured for this route.</p>
                  <p className="text-[11px] text-zinc-500">Select a preset above to guard this endpoint with authentication or rate limiting.</p>
                </div>
              ) : (
                endpoint.middlewares.map((mw, idx) => {
                  const isEditing = editingMwId === mw.id;
                  return (
                    <div 
                      key={mw.id} 
                      className={`rounded-xl border transition-all overflow-hidden ${
                        mw.enabled ? 'bg-[#141418] border-indigo-500/40 shadow-lg' : 'bg-zinc-950/60 border-zinc-800 opacity-60'
                      }`}
                    >
                      {/* Routine Header Bar */}
                      <div className="p-4 flex items-center justify-between gap-3 bg-zinc-900/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Order Index */}
                          <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>

                          {/* Enable Toggle */}
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
                                className="bg-transparent font-semibold text-xs text-zinc-100 focus:outline-none focus:border-b focus:border-indigo-500 truncate"
                              />
                              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md font-mono ${
                                mw.type === 'auth' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                mw.type === 'permission' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                mw.type === 'rate_limit' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}>
                                {mw.type}
                              </span>
                            </div>
                            {mw.description && (
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">{mw.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveMiddleware(mw.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMiddleware(mw.id, 'down')}
                            disabled={idx === (endpoint.middlewares?.length || 1) - 1}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingMwId(isEditing ? null : mw.id)} 
                            className="text-xs font-semibold text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1 transition-colors"
                          >
                            {isEditing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            <span>{isEditing ? 'Collapse Code' : 'Edit PHP Logic'}</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => removeMiddleware(mw.id)} 
                            className="text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                            title="Delete middleware"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Code Editor for Middleware Routine */}
                      {isEditing && (
                        <div className="p-4 border-t border-zinc-800 bg-[#0d0d10] space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Code size={12} className="text-indigo-400" />
                              <span>Pre-Callback PHP Logic ($request context available)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setActiveMwSnippetModalId(mw.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 px-2.5 py-1 rounded-lg transition-colors shadow-sm"
                            >
                              <Sparkles size={12} className="text-amber-300" />
                              <span>Snippet Boilerplate</span>
                            </button>
                          </div>

                          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-[#18181c] relative min-h-[160px]">
                            <Editor
                              value={mw.callbackSnippet}
                              onValueChange={code => updateMiddleware(mw.id, { callbackSnippet: code })}
                              highlight={code => Prism.highlight(code, Prism.languages.php, 'php')}
                              padding={16}
                              style={{
                                fontFamily: '"Fira Code", "Consolas", monospace',
                                fontSize: 12,
                                backgroundColor: '#18181c',
                                minHeight: '160px',
                                color: '#d4d4d8'
                              }}
                              className="min-h-[160px]"
                              textareaClassName="focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>💡 Return <code>new WP_Error('code', 'message', array('status' =&gt; 403))</code> to reject request immediately.</span>
                            <span className="font-mono text-[10px] text-indigo-400">PHP 7.4+</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: REST CALLBACK PHP LOGIC */}
        {/* ========================================================================= */}
        {activeTab === 'logic' && (
          <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-150">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Code size={16} className="text-emerald-400" />
                  <span>Main Endpoint Callback: {endpoint.callbackFunction}( $request )</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Write custom PHP routines, query databases, fire action hooks, or call global helper functions.
                </p>
              </div>
            </div>

            <CodeEditor 
              value={endpoint.customPhp || ''}
              onChange={(val) => onChange({ ...endpoint, customPhp: val })}
              parameters={endpoint.parameters}
              targetCptSlug={endpoint.storage?.enabled ? endpoint.storage.targetCptSlug : undefined}
              postTypes={postTypes}
              globalHelpers={globalHelpers}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: STORAGE & CPT SYNC */}
        {/* ========================================================================= */}
        {activeTab === 'storage' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
            
            {/* Storage Automator Switch Card */}
            <div className={`bg-[#141418] border transition-all rounded-xl p-6 shadow-xl ${
              endpoint.storage?.enabled ? 'border-emerald-500/40' : 'border-zinc-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">WordPress Post & Meta Storage Automator</h3>
                    <p className="text-xs text-zinc-400">Automatically inserts or updates a Custom Post Type and meta keys from incoming REST parameters without writing raw SQL.</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={endpoint.storage?.enabled || false}
                    onChange={e => handleStorageToggle(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                </label>
              </div>

              {endpoint.storage?.enabled ? (
                <div className="space-y-6 pt-4 border-t border-zinc-800">
                  {/* Select Target CPT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                        TARGET CUSTOM POST TYPE
                      </label>
                      <select
                        value={endpoint.storage.targetCptSlug}
                        onChange={e => handleTargetCptChange(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {postTypes.map(pt => (
                          <option key={pt.slug} value={pt.slug}>
                            {pt.singularName} ({pt.slug})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (endpoint.storage?.targetCptSlug) {
                            const newMapping = generateAutoMapping(endpoint.storage.targetCptSlug);
                            onChange({
                              ...endpoint,
                              storage: { ...endpoint.storage, fieldMapping: newMapping }
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/60 px-3 py-2 rounded-lg transition-colors"
                      >
                        <Sparkles size={13} className="text-amber-300" />
                        <span>Auto-Map Matching Fields</span>
                      </button>
                    </div>
                  </div>

                  {/* Field Mapping Table */}
                  {targetCpt && (
                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Interconnected Field Mapping
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {endpoint.parameters.length} endpoint parameters available
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-4 px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <span className="col-span-5">Incoming REST Parameter</span>
                        <span className="col-span-2 text-center">Sync</span>
                        <span className="col-span-5">Target CPT Post Field / Meta Key</span>
                      </div>

                      {endpoint.parameters.length === 0 ? (
                        <div className="text-center py-6 text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                          No parameters defined yet. Add parameters in the Route & Parameters tab to map them.
                        </div>
                      ) : (
                        endpoint.parameters.map(param => {
                          const mappedTo = endpoint.storage?.fieldMapping[param.key] || '';
                          return (
                            <div 
                              key={param.id} 
                              className="grid grid-cols-12 gap-3 items-center bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80"
                            >
                              <div className="col-span-5 flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-pink-300 truncate">{param.key}</span>
                                <span className="text-[10px] font-mono text-zinc-500">({param.type})</span>
                              </div>

                              <div className="col-span-2 flex justify-center">
                                <ArrowRight size={14} className={mappedTo ? 'text-emerald-400' : 'text-zinc-600'} />
                              </div>

                              <div className="col-span-5">
                                <select
                                  value={mappedTo}
                                  onChange={e => handleMappingChange(param.key, e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500"
                                >
                                  <option value="">(None - Do not persist)</option>
                                  <optgroup label="Core Post Fields">
                                    <option value="post_title">post_title (Title)</option>
                                    <option value="post_content">post_content (Content / Body)</option>
                                  </optgroup>
                                  {targetCpt.metaFields.length > 0 && (
                                    <optgroup label="Registered Meta Fields">
                                      {targetCpt.metaFields.map(mf => (
                                        <option key={mf.key} value={mf.key}>
                                          meta: {mf.key} ({mf.type})
                                        </option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Hook Fire Option */}
                  <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      WP ACTION HOOK TRIGGER
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-mono text-xs">do_action( '</span>
                      <input 
                        type="text" 
                        value={endpoint.hookName || ''} 
                        onChange={e => onChange({ ...endpoint, hookName: e.target.value })}
                        placeholder="my_plugin_endpoint_saved"
                        className="flex-1 bg-zinc-950 border border-zinc-800 text-yellow-400 font-mono text-xs rounded px-2.5 py-1.5 focus:border-yellow-500 focus:outline-none"
                      />
                      <span className="text-zinc-500 font-mono text-xs">', $request, $post_id );</span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                  Storage Automator is disabled. Turn it on to map incoming REST parameters directly into post and post_meta database records without manual PHP queries.
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* JSON Payload Importer Modal */}
      <JsonPayloadImporterModal
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        onImport={handleJsonImport}
      />

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

      {/* Input Types Help Modal */}
      {showTypeHelpModal && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTypeHelpModal(false)} />
          <div className="bg-[#18181b] border border-zinc-700/80 rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-pink-400" />
                <h3 className="font-bold text-sm text-white">WordPress REST Input Types & Sanitization Guide</h3>
              </div>
              <button onClick={() => setShowTypeHelpModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar">
              {Object.entries(PARAM_TYPE_DEFINITIONS).map(([tName, tInfo]) => (
                <div key={tName} className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${tInfo.color}`}>
                        {tName}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">{tInfo.label}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{tInfo.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold">Auto Sanitizer</span>
                    <span className="text-xs font-mono text-emerald-400">{tInfo.sanitize}()</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
              <button onClick={() => setShowTypeHelpModal(false)} className="px-4 py-1.5 rounded-lg bg-pink-600 text-white text-xs font-semibold">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
