import React, { useState } from 'react';
import { ProjectState, GlobalHelper, GlobalLogicType } from '../types';
import { CodeEditor } from './CodeEditor';
import { 
  Braces, Plus, Trash2, FunctionSquare, Zap, Filter, ShieldCheck, 
  Box, Sparkles, BookOpen, Check, Copy, Layers, Play
} from 'lucide-react';
import { logger } from '../utils/logger';

interface GlobalLogicEditorProps {
  project: ProjectState;
  onUpdate: (helper: GlobalHelper) => void;
  onAdd: (template?: Partial<GlobalHelper>) => void;
  onDelete: (id: string) => void;
  theme?: 'light' | 'dark';
}

const HOOK_PRESETS: Array<{
  label: string;
  type: GlobalLogicType;
  hookName?: string;
  name: string;
  parameters: string;
  priority?: number;
  acceptedArgs?: number;
  description: string;
  phpCode: string;
}> = [
  // Action Hook Presets
  {
    label: 'Action: init (Plugin Bootstrap)',
    type: 'action',
    hookName: 'init',
    name: 'custom_plugin_init_handler',
    parameters: '',
    priority: 10,
    acceptedArgs: 0,
    description: 'Runs on WordPress initialization. Ideal for rewrites and setup.',
    phpCode: `// WordPress is fully loaded. Custom rewrite rules or registrations here.\n// e.g. add_rewrite_rule( '^api-doc/?$', 'index.php?api_doc=1', 'top' );`
  },
  {
    label: 'Action: rest_api_init (REST Fields)',
    type: 'action',
    hookName: 'rest_api_init',
    name: 'custom_register_extra_rest_fields',
    parameters: '',
    priority: 10,
    acceptedArgs: 0,
    description: 'Expose custom computed fields on standard WP REST routes.',
    phpCode: `register_rest_field( 'post', 'reading_time_minutes', array(\n\t'get_callback' => function( $post_arr ) {\n\t\t$content = get_post_field( 'post_content', $post_arr['id'] );\n\t\t$word_count = str_word_count( strip_tags( $content ) );\n\t\treturn ceil( $word_count / 200 );\n\t},\n\t'schema' => array( 'type' => 'integer', 'description' => 'Estimated read time' ),\n) );`
  },
  {
    label: 'Action: save_post (Sync & Invalidation)',
    type: 'action',
    hookName: 'save_post',
    name: 'custom_on_post_save_sync',
    parameters: '$post_id, $post, $update',
    priority: 10,
    acceptedArgs: 3,
    description: 'Triggers whenever a post or CPT is published or updated.',
    phpCode: `// Avoid autosaves or revisions\nif ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;\nif ( wp_is_post_revision( $post_id ) ) return;\n\n// Invalidate cache or trigger external webhook\nwp_cache_delete( 'custom_project_cache_' . $post_id );`
  },
  {
    label: 'Action: wp_login (Audit Log)',
    type: 'action',
    hookName: 'wp_login',
    name: 'custom_user_login_audit',
    parameters: '$user_login, $user',
    priority: 10,
    acceptedArgs: 2,
    description: 'Audit logger triggered when a user successfully authenticates.',
    phpCode: `update_user_meta( $user->ID, 'last_api_login_timestamp', current_time( 'mysql' ) );`
  },

  // Filter Hook Presets
  {
    label: 'Filter: the_content (Transform Content)',
    type: 'filter',
    hookName: 'the_content',
    name: 'custom_content_transformer',
    parameters: '$content',
    priority: 10,
    acceptedArgs: 1,
    description: 'Transform post or page body content before output.',
    phpCode: `if ( is_single() ) {\n\t$content .= '<div class="custom-api-badge">Generated via WP API Architect</div>';\n}\nreturn $content;`
  },
  {
    label: 'Filter: rest_prepare_post (Response Envelope)',
    type: 'filter',
    hookName: 'rest_prepare_post',
    name: 'custom_format_rest_response_envelope',
    parameters: '$response, $post, $request',
    priority: 10,
    acceptedArgs: 3,
    description: 'Decorate REST API responses before dispatch.',
    phpCode: `$data = $response->get_data();\n$data['meta_signature'] = hash( 'sha256', $post->post_date );\n$response->set_data( $data );\nreturn $response;`
  },
  {
    label: 'Filter: wp_insert_post_data (Pre-DB Sanitize)',
    type: 'filter',
    hookName: 'wp_insert_post_data',
    name: 'custom_sanitize_post_before_insert',
    parameters: '$data, $postarr',
    priority: 10,
    acceptedArgs: 2,
    description: 'Sanitize or validate post fields right before saving to SQL database.',
    phpCode: `// Enforce uppercase titles if needed\nif ( ! empty( $data['post_title'] ) ) {\n\t// $data['post_title'] = sanitize_text_field( $data['post_title'] );\n}\nreturn $data;`
  },

  // Middleware Presets
  {
    label: 'Middleware: Global Bearer Auth Guard',
    type: 'middleware',
    name: 'custom_global_bearer_auth_guard',
    parameters: '$result, $server, $request',
    priority: 10,
    acceptedArgs: 3,
    description: 'Intercepts incoming REST calls to validate Authorization header token.',
    phpCode: `$route = $request->get_route();\n// Guard only custom namespace routes\nif ( strpos( $route, '/wp/v' ) === 0 || strpos( $route, '/api/' ) === 0 ) {\n\t$auth_header = $request->get_header( 'authorization' );\n\tif ( empty( $auth_header ) ) {\n\t\t// Optional: enforce Bearer token\n\t\t// return new WP_Error( 'rest_forbidden', 'Missing Authorization Header', array( 'status' => 401 ) );\n\t}\n}\nreturn $result;`
  },
  {
    label: 'Middleware: Global CORS Pre-flight Handler',
    type: 'middleware',
    name: 'custom_global_cors_header_injector',
    parameters: '$result, $server, $request',
    priority: 10,
    acceptedArgs: 3,
    description: 'Injects modern permissive Cross-Origin headers for headless frontends.',
    phpCode: `header( 'Access-Control-Allow-Origin: *' );\nheader( 'Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE, PATCH' );\nheader( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );\n\nif ( 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {\n\tstatus_header( 200 );\n\texit();\n}\nreturn $result;`
  },

  // Modern OOP Module
  {
    label: 'Class: Modern Singleton Service',
    type: 'class',
    name: 'WP_Architect_Core_Service',
    parameters: '',
    description: 'Modern OOP singleton class with encapsulated hook bindings.',
    phpCode: `private static $instance = null;\n\npublic static function init() {\n\tif ( null === self::$instance ) {\n\t\tself::$instance = new self();\n\t}\n\treturn self::$instance;\n}\n\nprivate function __construct() {\n\tadd_action( 'init', array( $this, 'on_init' ) );\n}\n\npublic function on_init() {\n\t// Service initialization logic\n}`
  },

  // Pure Helper Function
  {
    label: 'Function: JSON API Response Helper',
    type: 'function',
    name: 'wp_architect_json_response',
    parameters: '$data, $status = 200, $message = "OK"',
    description: 'Reusable standardized JSON envelope formatter.',
    phpCode: `return new WP_REST_Response( array(\n\t'status'  => $status,\n\t'message' => $message,\n\t'data'    => $data,\n\t'time'    => time()\n), $status );`
  }
];

export const GlobalLogicEditor: React.FC<GlobalLogicEditorProps> = ({ 
  project, 
  onUpdate, 
  onAdd, 
  onDelete 
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(project.globalHelpers?.[0]?.id || null);
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const selectedHelper = project.globalHelpers.find(h => h.id === selectedId) || project.globalHelpers[0];

  const filteredHelpers = project.globalHelpers.filter(h => {
    if (filterType === 'all') return true;
    const type = h.type || 'function';
    return type === filterType;
  });

  const handleCreateFromPreset = (preset: typeof HOOK_PRESETS[0]) => {
    const newHelper: GlobalHelper = {
      id: `logic_${Date.now()}`,
      name: `${preset.name}_${Math.random().toString(36).substring(2, 5)}`,
      type: preset.type,
      hookName: preset.hookName,
      priority: preset.priority || 10,
      acceptedArgs: preset.acceptedArgs || 1,
      parameters: preset.parameters,
      description: preset.description,
      phpCode: preset.phpCode
    };
    onAdd(newHelper);
    setSelectedId(newHelper.id);
    logger.success(`Created ${preset.type.toUpperCase()}: ${newHelper.name}`);
  };

  const getBadgeColor = (type: GlobalLogicType = 'function') => {
    switch (type) {
      case 'action': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'filter': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'middleware': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'class': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default: return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
  };

  const getTypeIcon = (type: GlobalLogicType = 'function') => {
    switch (type) {
      case 'action': return <Zap size={14} className="text-amber-500" />;
      case 'filter': return <Filter size={14} className="text-emerald-500" />;
      case 'middleware': return <ShieldCheck size={14} className="text-purple-500" />;
      case 'class': return <Box size={14} className="text-blue-500" />;
      default: return <FunctionSquare size={14} className="text-indigo-500" />;
    }
  };

  // Generate live declaration preview
  const getDeclarationPreview = (helper: GlobalHelper) => {
    const type = helper.type || 'function';
    const hook = helper.hookName || 'init';
    const prio = helper.priority ?? 10;
    const args = helper.acceptedArgs ?? 1;

    if (type === 'action') {
      return `add_action( '${hook}', '${helper.name}', ${prio}, ${args} );\nfunction ${helper.name}( ${helper.parameters} ) { ... }`;
    }
    if (type === 'filter') {
      return `add_filter( '${hook}', '${helper.name}', ${prio}, ${args} );\nfunction ${helper.name}( ${helper.parameters} ) { ... }`;
    }
    if (type === 'middleware') {
      return `add_filter( 'rest_pre_dispatch', '${helper.name}', ${prio}, 3 );\nfunction ${helper.name}( $result, $server, $request ) { ... }`;
    }
    if (type === 'class') {
      return `class ${helper.name} {\n  public static function init() { ... }\n}`;
    }
    return `function ${helper.name}( ${helper.parameters} ) { ... }`;
  };

  const copyLiveCode = () => {
    if (!selectedHelper) return;
    navigator.clipboard.writeText(getDeclarationPreview(selectedHelper));
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-white dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      {/* Sidebar List */}
      <div className="w-full md:w-80 bg-slate-50 dark:bg-[#121214] border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
           <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200 text-sm">
              <Braces size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>Global Logic & Hooks</span>
           </div>
           <button 
             onClick={() => onAdd({
               name: 'custom_helper_function',
               type: 'function',
               parameters: '$arg1',
               description: 'Custom global helper function',
               phpCode: '// Helper PHP routine'
             })}
             className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
             title="Add Custom Function"
           >
             <Plus size={14} /> New
           </button>
        </div>

        {/* Preset Library Dropdown / Drawer */}
        <div className="p-3 border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
             <Sparkles size={11} className="text-amber-500" /> Quick Add WP Preset
          </label>
          <select 
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              if (!isNaN(idx) && HOOK_PRESETS[idx]) {
                handleCreateFromPreset(HOOK_PRESETS[idx]);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
             <option value="" disabled>Select Preset (Action, Filter, Middleware, Class)...</option>
             {HOOK_PRESETS.map((p, idx) => (
                <option key={idx} value={idx}>{p.label}</option>
             ))}
          </select>
        </div>

        {/* Category Filters */}
        <div className="flex gap-1 p-2 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto text-[11px]">
          {['all', 'action', 'filter', 'middleware', 'function', 'class'].map((cat) => (
             <button
               key={cat}
               onClick={() => setFilterType(cat)}
               className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors whitespace-nowrap ${
                 filterType === cat 
                   ? 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white font-bold' 
                   : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
               }`}
             >
               {cat}
             </button>
          ))}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
           {filteredHelpers.map(helper => {
             const type = helper.type || 'function';
             const isSelected = selectedHelper?.id === helper.id;

             return (
               <button
                 key={helper.id}
                 onClick={() => setSelectedId(helper.id)}
                 className={`w-full text-left p-3 rounded-lg border flex flex-col gap-1 transition-all ${
                   isSelected 
                     ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/40 shadow-sm' 
                     : 'bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700'
                 }`}
               >
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                       {getTypeIcon(type)}
                       <span className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 truncate">
                         {helper.name}
                       </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono font-bold ${getBadgeColor(type)}`}>
                       {type}
                    </span>
                 </div>
                 
                 {type === 'action' || type === 'filter' ? (
                   <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                      Hook: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{helper.hookName || 'init'}</span> (Prio: {helper.priority ?? 10})
                   </div>
                 ) : (
                   <div className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono truncate">
                      {helper.description || helper.parameters || 'Custom routine'}
                   </div>
                 )}
               </button>
             );
           })}

           {filteredHelpers.length === 0 && (
             <div className="text-center py-12 text-slate-400 dark:text-zinc-600 text-xs">
                No logic items match this filter. Click "New" or choose a Preset above.
             </div>
           )}
        </div>
      </div>

      {/* Main Editor Canvas */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#09090b] overflow-hidden">
        {selectedHelper ? (
          <div className="flex-1 flex flex-col h-full overflow-y-auto">
            {/* Header & Meta Config */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#09090b]">
               <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className={`text-xs px-2 py-0.5 rounded border uppercase font-mono font-bold ${getBadgeColor(selectedHelper.type || 'function')}`}>
                          {selectedHelper.type || 'function'}
                       </span>
                       <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedHelper.name}</h2>
                    </div>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs">
                       WordPress Action, Filter, Middleware, or Reusable PHP helper routine.
                    </p>
                 </div>

                 <div className="flex items-center gap-2">
                   <button
                     onClick={copyLiveCode}
                     className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-zinc-700"
                   >
                     {copiedSnippet ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                     {copiedSnippet ? 'Copied!' : 'Copy Code Signature'}
                   </button>
                   <button 
                     onClick={() => onDelete(selectedHelper.id)}
                     className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium border border-red-200 dark:border-red-900/30"
                   >
                     <Trash2 size={14} /> Delete
                   </button>
                 </div>
               </div>

               {/* Type & Identity Fields */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Logic Type */}
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-1">
                        LOGIC TYPE
                     </label>
                     <select 
                       value={selectedHelper.type || 'function'}
                       onChange={(e) => onUpdate({ ...selectedHelper, type: e.target.value as GlobalLogicType })}
                       className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-800 dark:text-zinc-100 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                     >
                       <option value="function">Function (Standalone Helper)</option>
                       <option value="action">Action Hook (add_action)</option>
                       <option value="filter">Filter Hook (add_filter)</option>
                       <option value="middleware">REST Middleware (Pre-Dispatch)</option>
                       <option value="class">OOP Class / Module</option>
                     </select>
                  </div>

                  {/* Function/Callback Name */}
                  <div className="md:col-span-2">
                     <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-1">
                        {selectedHelper.type === 'class' ? 'CLASS NAME' : 'CALLBACK / FUNCTION NAME'}
                     </label>
                     <input 
                       type="text" 
                       value={selectedHelper.name}
                       onChange={(e) => onUpdate({ ...selectedHelper, name: e.target.value })}
                       className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                       placeholder="my_callback_handler"
                     />
                  </div>

                  {/* Description */}
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-1">
                        DESCRIPTION / PURPOSE
                     </label>
                     <input 
                       type="text" 
                       value={selectedHelper.description}
                       onChange={(e) => onUpdate({ ...selectedHelper, description: e.target.value })}
                       className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-700 dark:text-zinc-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                       placeholder="Brief explanation..."
                     />
                  </div>
               </div>

               {/* Action / Filter Specific Controls */}
               {(selectedHelper.type === 'action' || selectedHelper.type === 'filter') && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-slate-100 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800">
                    <div>
                       <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                          WORDPRESS HOOK NAME
                       </label>
                       <input 
                         type="text" 
                         value={selectedHelper.hookName || ''}
                         onChange={(e) => onUpdate({ ...selectedHelper, hookName: e.target.value })}
                         className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                         placeholder="init, save_post, the_content, etc."
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                          PRIORITY (DEFAULT 10)
                       </label>
                       <input 
                         type="number" 
                         value={selectedHelper.priority ?? 10}
                         onChange={(e) => onUpdate({ ...selectedHelper, priority: parseInt(e.target.value) || 10 })}
                         className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-zinc-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                          ACCEPTED ARGS COUNT
                       </label>
                       <input 
                         type="number" 
                         value={selectedHelper.acceptedArgs ?? 1}
                         onChange={(e) => onUpdate({ ...selectedHelper, acceptedArgs: parseInt(e.target.value) || 1 })}
                         className="w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-zinc-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                       />
                    </div>
                 </div>
               )}

               {/* Parameters signature (unless class) */}
               {selectedHelper.type !== 'class' && (
                 <div className="mb-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-1">
                       PARAMETERS SIGNATURE ($arg1, $arg2 = null, ...)
                    </label>
                    <input 
                      type="text" 
                      value={selectedHelper.parameters}
                      onChange={(e) => onUpdate({ ...selectedHelper, parameters: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-orange-600 dark:text-orange-300 font-mono text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="$post_id, $post = null"
                    />
                 </div>
               )}

               {/* Live Declaration Preview Banner */}
               <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] flex items-center justify-between border border-slate-700">
                  <div className="flex items-center gap-2">
                     <span className="text-indigo-400 font-bold">Preview:</span>
                     <code className="text-emerald-400">{getDeclarationPreview(selectedHelper)}</code>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase">Compiled in plugin.php</span>
               </div>
            </div>

            {/* Code Body Editor */}
            <div className="flex-1 p-6 flex flex-col min-h-[420px]">
               <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase flex items-center gap-1.5">
                    <Braces size={14} className="text-indigo-500" /> 
                    {selectedHelper.type === 'class' ? 'Class Body & Methods (PHP)' : 'Function Body Implementation (PHP)'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">PHP 7.4 / 8.x Compatible</span>
               </div>

               <div className="flex-1 border border-slate-300 dark:border-zinc-800 rounded-xl overflow-hidden shadow-lg min-h-[350px]">
                 <CodeEditor 
                   value={selectedHelper.phpCode}
                   onChange={(val) => onUpdate({ ...selectedHelper, phpCode: val })}
                   parameters={[]} 
                   postTypes={project.postTypes}
                   globalHelpers={project.globalHelpers}
                 />
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 p-8">
             <div className="p-5 bg-slate-100 dark:bg-zinc-900 rounded-2xl mb-4 border border-slate-200 dark:border-zinc-800">
               <Braces size={40} className="text-indigo-500" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200 mb-1">Global Logic, Actions & Filters</h3>
             <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm text-center mb-4">
                Select a routine from the left or generate from built-in WordPress hooks and middleware templates.
             </p>
             <button
               onClick={() => handleCreateFromPreset(HOOK_PRESETS[0])}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md"
             >
                Add Action: init Hook
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
