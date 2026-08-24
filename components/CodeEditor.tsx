import React, { useState, useEffect } from 'react';
import { EndpointParameter, CustomPostType, FieldType, GlobalHelper } from '../types';
import { Code, Copy, Box, Variable, Play, Check, Layers, Sparkles, BookOpen, Search, Command } from 'lucide-react';
import { SnippetLibraryModal } from './SnippetLibraryModal';
import { QuickSnippetPopup } from './QuickSnippetPopup';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  parameters: EndpointParameter[];
  targetCptSlug?: string;
  postTypes: CustomPostType[];
  globalHelpers: GlobalHelper[];
  scope?: 'callback' | 'middleware' | 'all';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  parameters, 
  targetCptSlug, 
  postTypes, 
  globalHelpers,
  scope = 'callback'
}) => {
  const [copied, setCopied] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isQuickPopupOpen, setIsQuickPopupOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + S or Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsQuickPopupOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const insertSnippet = (snippet: string) => {
    const newVal = value + (value ? '\n\n' : '') + snippet;
    onChange(newVal);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code: string) => {
    return Prism.highlight(code, Prism.languages.php, 'php')
      .split('\n')
      .map((line, i) => `<span class='line-number text-zinc-700 select-none mr-4 text-xs w-4 inline-block text-right'>${i + 1}</span>${line}`)
      .join('\n');
  };

  const targetCpt = postTypes.find(p => p.slug === targetCptSlug);

  return (
    <div className="flex w-full min-h-[500px] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-[#1e1e1e] shadow-xl relative text-slate-900 dark:text-zinc-100">
      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <div className="bg-slate-100 dark:bg-[#252526] px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                <Code size={14} className="text-indigo-600 dark:text-blue-400" />
                <span>custom_logic.php</span>
            </div>
            <div className="flex items-center gap-2">
                {/* Quick Snippet Selector Button */}
                <button 
                  type="button"
                  onClick={() => setIsQuickPopupOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                  title="Quick Snippet Selector (Ctrl/Cmd+K)"
                >
                  <Search size={12} className="text-indigo-200" />
                  <span>Snippet Selector</span>
                  <kbd className="hidden sm:inline text-[9px] bg-indigo-800/80 px-1 rounded text-indigo-200 font-mono">⌘K</kbd>
                </button>

                <button 
                  type="button"
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-300 text-xs font-medium border border-slate-300 dark:border-zinc-700 transition-all"
                  title="Browse full boilerplate library modal"
                >
                  <Sparkles size={12} className="text-amber-500 dark:text-amber-400" />
                  <span>Full Library</span>
                </button>

                <span className="text-[10px] text-slate-500 uppercase bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">PHP 7.4+</span>
                <button onClick={handleCopy} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1" title="Copy code">
                    {copied ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1d1f21] relative light-code-theme">
            <Editor
                value={value}
                onValueChange={code => onChange(code)}
                highlight={code => Prism.highlight(code, Prism.languages.php, 'php')}
                padding={20}
                style={{
                    fontFamily: '"Fira Code", "Consolas", monospace',
                    fontSize: 13,
                    minHeight: '100%'
                }}
                className="min-h-full"
                textareaClassName="focus:outline-none"
            />
        </div>
      </div>

      {/* Context Sidebar */}
      <div className="w-64 bg-slate-100 dark:bg-[#252526] border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-slate-200/70 dark:bg-[#2d2d30]">
            Context Variables
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
            
            {/* Global Helpers */}
            <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-500 mb-2 font-bold flex items-center gap-1">
                    <Check size={10} /> GLOBAL HELPERS
                </div>
                {globalHelpers.map(helper => (
                    <button
                        key={helper.id}
                        onClick={() => insertSnippet(`${helper.name}(/* ${helper.parameters} */);`)}
                        className="w-full text-left text-xs font-mono text-emerald-600 dark:text-emerald-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded truncate transition-colors mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                        title={helper.description}
                    >
                        {helper.name}()
                    </button>
                ))}
            </div>

            {/* Request Params */}
            <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-500 mb-2 font-bold flex items-center gap-1">
                    <Variable size={10} /> INCOMING PARAMS
                </div>
                {parameters.map(param => (
                    <button
                        key={param.id}
                        onClick={() => insertSnippet(`$${param.key} = $request->get_param('${param.key}');`)}
                        className="w-full text-left text-xs font-mono text-pink-600 dark:text-pink-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded truncate transition-colors group border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                        title={`Click to insert $${param.key}`}
                    >
                        <span className="text-pink-500">$</span>{param.key}
                    </button>
                ))}
                {parameters.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-600 italic px-2">No parameters</span>}
            </div>

            {/* Storage Context */}
            {targetCpt && (
                <div>
                    <div className="text-[10px] text-slate-500 mb-2 font-bold flex items-center gap-1">
                        <Box size={10} /> TARGET OBJECT ({targetCpt.slug})
                    </div>
                    <div className="px-2 mb-2 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        Storage enabled. <code>$post_id</code> is available.
                    </div>
                    <button
                        onClick={() => insertSnippet(`if ( $post_id ) {\n    // Additional logic for post $post_id\n}`)}
                        className="w-full text-left text-xs font-mono text-indigo-600 dark:text-indigo-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded truncate transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600 mb-1"
                    >
                        Check $post_id
                    </button>
                    {targetCpt.metaFields.map(field => {
                        if (field.type === FieldType.REPEATER) {
                            return (
                                <button
                                    key={field.id}
                                    onClick={() => insertSnippet(`// ACF syntax for repeater\n$my_repeater_data = array(\n    array(\n        // sub_field_key => 'value'\n    )\n);\nupdate_field('${field.key}', $my_repeater_data, $post_id);`)}
                                    className="w-full text-left text-xs font-mono text-purple-600 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded truncate transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600 flex items-center gap-1"
                                    title="Insert Repeater snippet (ACF-style)"
                                >
                                    <Layers size={10} className="shrink-0" /> ACF loop: {field.key}
                                </button>
                            );
                        }
                        
                        return (
                            <button
                                key={field.id}
                                onClick={() => insertSnippet(`update_post_meta($post_id, '${field.key}', $value);`)}
                                className="w-full text-left text-xs font-mono text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded truncate transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                            >
                                meta: {field.key}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Snippets */}
            <div>
                <div className="text-[10px] text-slate-500 mb-2 font-bold flex items-center gap-1">
                    <Play size={10} /> SNIPPETS
                </div>
                <button
                    onClick={() => insertSnippet(`global $wpdb;\n$results = $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}posts LIMIT 10", OBJECT );`)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 truncate"
                    title="Custom Read with WPDB"
                >
                    $wpdb Custom Query
                </button>
                <button
                    onClick={() => insertSnippet(`$args = array(\n    'post_type' => 'post',\n    'posts_per_page' => -1\n);\n$query = new WP_Query( $args );`)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 truncate"
                >
                    WP_Query Loop
                </button>
                <button
                    onClick={() => insertSnippet(`$response = wp_remote_get( 'https://api.example.com/data' );\nif ( is_wp_error( $response ) ) {\n    $error_message = $response->get_error_message();\n} else {\n    $body = wp_remote_retrieve_body( $response );\n    $data = json_decode( $body );\n}`)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 truncate"
                >
                    HTTP GET Request
                </button>
                <button
                    onClick={() => insertSnippet(`if ( is_wp_error( $result ) ) {\n    return new WP_Error( 'error', 'Message', array( 'status' => 500 ) );\n}`)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                >
                    Error Handling
                </button>
                <button
                    onClick={() => insertSnippet(`$user_id = get_current_user_id();`)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                >
                    Get User ID
                </button>
                <button
                    onClick={() => insertSnippet(`$headers = array('Content-Type: text/html; charset=UTF-8');\nwp_mail( $to, $subject, $body, $headers );`)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                >
                    WP Mail
                </button>
                <button
                    onClick={() => insertSnippet(`if ( have_rows('repeater_key', $post_id) ) {\n    while( have_rows('repeater_key', $post_id) ) {\n        the_row();\n        $sub_val = get_sub_field('sub_key');\n    }\n}`)}
                    className="w-full text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#37373d] p-1.5 rounded transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600 truncate"
                >
                    ACF have_rows Loop
                </button>
            </div>

        </div>
      </div>

      {/* Snippet Library Modal */}
      <SnippetLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onInsert={insertSnippet}
        scope={scope}
      />

      {/* Quick Snippet Selector Popup */}
      <QuickSnippetPopup
        isOpen={isQuickPopupOpen}
        onClose={() => setIsQuickPopupOpen(false)}
        onInsert={insertSnippet}
        scope={scope}
        title="REST & PHP Snippet Selector"
      />
    </div>
  );
};