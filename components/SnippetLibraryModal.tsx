import React, { useState } from 'react';
import { 
  CodeSnippet, 
  CODE_SNIPPETS_LIBRARY, 
  SNIPPET_CATEGORIES 
} from '../services/snippetLibrary';
import { 
  Sparkles, Search, Copy, Check, Plus, ShieldCheck, 
  ShieldAlert, CheckCircle, Send, Database, Globe, Layers, X
} from 'lucide-react';

interface SnippetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
  scope?: 'callback' | 'middleware' | 'all';
}

export const SnippetLibraryModal: React.FC<SnippetLibraryModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  scope = 'all'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSnippets = CODE_SNIPPETS_LIBRARY.filter(s => {
    // Filter by scope if defined
    if (scope !== 'all' && s.targetScope && s.targetScope !== 'all' && s.targetScope !== scope) {
      return false;
    }
    // Filter by category
    if (selectedCategory !== 'all' && s.category !== selectedCategory) {
      return false;
    }
    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchCode = s.code.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchCode;
    }
    return true;
  });

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'sanitize': return <ShieldAlert size={14} className="text-amber-500" />;
      case 'auth_security': return <ShieldCheck size={14} className="text-purple-500" />;
      case 'validation': return <CheckCircle size={14} className="text-emerald-500" />;
      case 'response_format': return <Send size={14} className="text-blue-500" />;
      case 'db_queries': return <Database size={14} className="text-cyan-500" />;
      case 'http_external': return <Globe size={14} className="text-pink-500" />;
      default: return <Layers size={14} className="text-indigo-500" />;
    }
  };

  const handleCopy = (snippet: CodeSnippet) => {
    navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (snippet: CodeSnippet) => {
    onInsert(snippet.code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
              <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Boilerplate Snippets Library
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono font-medium">
                  {filteredSnippets.length} snippets
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Production-tested WordPress REST routines for sanitization, nonces, rate limiting, and database queries.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex flex-col sm:flex-row gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search snippets (e.g. Nonce, Sanitize, Rate Limit, WPDB, Webhook)..."
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>

          {/* Categories Pill Scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              All Categories
            </button>
            {SNIPPET_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Snippets List Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50 dark:bg-[#09090b]">
          {filteredSnippets.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-zinc-600 text-xs">
              No boilerplate snippets matched your search query. Try broadening your keywords.
            </div>
          ) : (
            filteredSnippets.map(snippet => (
              <div
                key={snippet.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col gap-3 group"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryIcon(snippet.category)}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {snippet.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-mono">
                        {snippet.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {snippet.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(snippet)}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-zinc-700"
                    >
                      {copiedId === snippet.id ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                      <span>{copiedId === snippet.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => handleInsert(snippet)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Plus size={13} />
                      <span>Insert Code</span>
                    </button>
                  </div>
                </div>

                {/* Code Preview Frame */}
                <div className="bg-[#1e1e1e] rounded-lg p-3 overflow-x-auto border border-zinc-800 font-mono text-[11px] text-zinc-300 relative max-h-44">
                  <pre className="whitespace-pre">{snippet.code}</pre>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 shrink-0">
          <span>Click <b>Insert Code</b> to append directly into the editor canvas</span>
          <span className="font-mono text-[10px] uppercase">WordPress 6.x & PHP 8.x Safe</span>
        </div>

      </div>
    </div>
  );
};
