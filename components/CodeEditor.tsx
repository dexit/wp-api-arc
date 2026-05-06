import React from 'react';
import { EndpointParameter, CustomPostType, FieldType } from '../types';
import { Code, Copy, Box, Variable, Play, Check, Layers } from 'lucide-react';
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
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, parameters, targetCptSlug, postTypes }) => {
  const [copied, setCopied] = React.useState(false);

  const insertSnippet = (snippet: string) => {
    // Basic insertion at end - in a full IDE we would insert at cursor, 
    // but simple editor is sufficient here.
    const newVal = value + (value ? '\n' : '') + snippet;
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
    <div className="flex w-full min-h-[500px] border border-slate-700 rounded-lg overflow-hidden bg-[#1e1e1e]">
      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <div className="bg-[#252526] px-4 py-2 border-b border-slate-700 flex justify-between items-center z-10">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Code size={14} className="text-blue-400" />
                <span>custom_logic.php</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 uppercase bg-slate-800 px-2 py-0.5 rounded">PHP 7.4+</span>
                <button onClick={handleCopy} className="text-slate-400 hover:text-white transition-colors">
                    {copied ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1d1f21] relative">
            <Editor
                value={value}
                onValueChange={code => onChange(code)}
                highlight={code => Prism.highlight(code, Prism.languages.php, 'php')}
                padding={20}
                style={{
                    fontFamily: '"Fira Code", "Consolas", monospace',
                    fontSize: 13,
                    backgroundColor: '#1d1f21',
                    minHeight: '100%',
                    color: '#c5c8c6'
                }}
                className="min-h-full"
                textareaClassName="focus:outline-none"
            />
        </div>
      </div>

      {/* Context Sidebar */}
      <div className="w-64 bg-[#252526] border-l border-slate-700 flex flex-col shrink-0 z-20">
        <div className="p-3 border-b border-slate-700 font-semibold text-xs text-slate-300 uppercase tracking-wider bg-[#2d2d30]">
            Context Variables
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
            
            {/* Request Params */}
            <div>
                <div className="text-[10px] text-slate-500 mb-2 font-bold flex items-center gap-1">
                    <Variable size={10} /> INCOMING PARAMS
                </div>
                {parameters.map(param => (
                    <button
                        key={param.id}
                        onClick={() => insertSnippet(`$${param.key} = $request->get_param('${param.key}');`)}
                        className="w-full text-left text-xs font-mono text-pink-300 hover:bg-[#37373d] p-1.5 rounded truncate transition-colors group border border-transparent hover:border-slate-600"
                        title={`Click to insert $${param.key}`}
                    >
                        <span className="text-pink-500">$</span>{param.key}
                    </button>
                ))}
                {parameters.length === 0 && <span className="text-xs text-slate-600 italic px-2">No parameters</span>}
            </div>

            {/* Storage Context */}
            {targetCpt && (
                <div>
                    <div className="text-[10px] text-slate-500 mb-2 font-bold flex items-center gap-1">
                        <Box size={10} /> TARGET OBJECT ({targetCpt.slug})
                    </div>
                    <div className="px-2 mb-2 text-[10px] text-slate-400 leading-tight">
                        Storage enabled. <code>$post_id</code> is available.
                    </div>
                    <button
                        onClick={() => insertSnippet(`if ( $post_id ) {\n    // Additional logic for post $post_id\n}`)}
                        className="w-full text-left text-xs font-mono text-indigo-300 hover:bg-[#37373d] p-1.5 rounded truncate transition-colors border border-transparent hover:border-slate-600 mb-1"
                    >
                        Check $post_id
                    </button>
                    {targetCpt.metaFields.map(field => {
                        if (field.type === FieldType.REPEATER) {
                            return (
                                <button
                                    key={field.id}
                                    onClick={() => insertSnippet(`// ACF syntax for repeater\n$my_repeater_data = array(\n    array(\n        // sub_field_key => 'value'\n    )\n);\nupdate_field('${field.key}', $my_repeater_data, $post_id);`)}
                                    className="w-full text-left text-xs font-mono text-purple-300 hover:bg-[#37373d] p-1.5 rounded truncate transition-colors border border-transparent hover:border-slate-600 flex items-center gap-1"
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
                                className="w-full text-left text-xs font-mono text-slate-400 hover:bg-[#37373d] p-1.5 rounded truncate transition-colors border border-transparent hover:border-slate-600"
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
                    className="w-full text-left text-xs text-slate-300 hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-600 truncate"
                    title="Custom Read with WPDB"
                >
                    $wpdb Custom Query
                </button>
                <button
                    onClick={() => insertSnippet(`$args = array(\n    'post_type' => 'post',\n    'posts_per_page' => -1\n);\n$query = new WP_Query( $args );`)}
                    className="w-full text-left text-xs text-slate-300 hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-600 truncate"
                >
                    WP_Query Loop
                </button>
                <button
                    onClick={() => insertSnippet(`$response = wp_remote_get( 'https://api.example.com/data' );\nif ( is_wp_error( $response ) ) {\n    $error_message = $response->get_error_message();\n} else {\n    $body = wp_remote_retrieve_body( $response );\n    $data = json_decode( $body );\n}`)}
                    className="w-full text-left text-xs text-slate-300 hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-600 truncate"
                >
                    HTTP GET Request
                </button>
                <button
                    onClick={() => insertSnippet(`if ( is_wp_error( $result ) ) {\n    return new WP_Error( 'error', 'Message', array( 'status' => 500 ) );\n}`)}
                    className="w-full text-left text-xs text-slate-300 hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-600"
                >
                    Error Handling
                </button>
                <button
                    onClick={() => insertSnippet(`$user_id = get_current_user_id();`)}
                    className="w-full text-left text-xs text-slate-300 hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-600"
                >
                    Get User ID
                </button>
                <button
                    onClick={() => insertSnippet(`$headers = array('Content-Type: text/html; charset=UTF-8');\nwp_mail( $to, $subject, $body, $headers );`)}
                    className="w-full text-left text-xs text-slate-300 hover:bg-[#37373d] p-1.5 rounded transition-colors mb-1 border border-transparent hover:border-slate-600"
                >
                    WP Mail
                </button>
                <button
                    onClick={() => insertSnippet(`if ( have_rows('repeater_key', $post_id) ) {\n    while( have_rows('repeater_key', $post_id) ) {\n        the_row();\n        $sub_val = get_sub_field('sub_key');\n    }\n}`)}
                    className="w-full text-left text-xs text-slate-300 hover:bg-[#37373d] p-1.5 rounded transition-colors border border-transparent hover:border-slate-600 truncate"
                >
                    ACF have_rows Loop
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};