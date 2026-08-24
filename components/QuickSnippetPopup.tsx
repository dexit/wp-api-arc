import React, { useState, useEffect, useRef } from 'react';
import { 
  CodeSnippet, 
  CODE_SNIPPETS_LIBRARY, 
  SNIPPET_CATEGORIES 
} from '../services/snippetLibrary';
import { 
  Sparkles, Search, Copy, Check, Plus, ShieldCheck, 
  ShieldAlert, CheckCircle, Send, Database, Globe, Layers, X,
  ExternalLink, Command
} from 'lucide-react';

interface QuickSnippetPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
  scope?: 'callback' | 'middleware' | 'all';
  position?: { top?: number; left?: number };
  title?: string;
}

export const QuickSnippetPopup: React.FC<QuickSnippetPopupProps> = ({
  isOpen,
  onClose,
  onInsert,
  scope = 'all',
  title = 'Quick Snippet Selector'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSnippets = CODE_SNIPPETS_LIBRARY.filter(s => {
    if (scope !== 'all' && s.targetScope && s.targetScope !== 'all' && s.targetScope !== scope) {
      return false;
    }
    if (selectedCategory !== 'all' && s.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredSnippets.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredSnippets.length) % Math.max(1, filteredSnippets.length));
    } else if (e.key === 'Enter' && filteredSnippets[selectedIndex]) {
      e.preventDefault();
      onInsert(filteredSnippets[selectedIndex].code);
      onClose();
    }
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'sanitize': return <ShieldAlert size={13} className="text-amber-500" />;
      case 'auth_security': return <ShieldCheck size={13} className="text-purple-500" />;
      case 'validation': return <CheckCircle size={13} className="text-emerald-500" />;
      case 'response_format': return <Send size={13} className="text-blue-500" />;
      case 'db_queries': return <Database size={13} className="text-cyan-500" />;
      case 'http_external': return <Globe size={13} className="text-pink-500" />;
      default: return <Layers size={13} className="text-indigo-500" />;
    }
  };

  const handleCopy = (e: React.MouseEvent, snippet: CodeSnippet) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#141418] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[82vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-slate-900 dark:text-zinc-100"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {title}
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono font-semibold">
                  {filteredSnippets.length} available
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
              Use <kbd className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-700 dark:text-zinc-300">↑</kbd> <kbd className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-700 dark:text-zinc-300">↓</kbd> + <kbd className="bg-slate-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-slate-700 dark:text-zinc-300">Enter</kbd>
            </span>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] space-y-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400 dark:text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search boilerplate (e.g. Nonce, Transient Cache, Capability, WP_Query, DB Index)..."
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedIndex(0); }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              All
            </button>
            {SNIPPET_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setSelectedIndex(0); }}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
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
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/60 dark:bg-[#09090b] custom-scrollbar">
          {filteredSnippets.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-zinc-600 text-xs">
              No boilerplate snippets matched your search.
            </div>
          ) : (
            filteredSnippets.map((snippet, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={snippet.id}
                  onClick={() => {
                    onInsert(snippet.code);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/60 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getCategoryIcon(snippet.category)}
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {snippet.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shrink-0">
                        {snippet.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, snippet)}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded text-[10px] font-medium transition-colors border border-slate-300 dark:border-zinc-700"
                        title="Copy code only"
                      >
                        {copiedId === snippet.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        <span className="ml-1">{copiedId === snippet.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsert(snippet.code);
                          onClose();
                        }}
                        className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-all shadow-xs flex items-center gap-1"
                      >
                        <Plus size={11} />
                        <span>Insert</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                    {snippet.description}
                  </p>

                  <div className="bg-[#18181b] rounded-lg p-2 overflow-x-auto border border-zinc-800/80 font-mono text-[11px] text-zinc-300 max-h-24 custom-scrollbar">
                    <pre className="whitespace-pre">{snippet.code.split('\n').slice(0, 3).join('\n')}{snippet.code.split('\n').length > 3 ? '\n...' : ''}</pre>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 shrink-0">
          <span>Click any snippet or press <b>Enter</b> to insert instantly</span>
          <span className="text-[10px] font-mono uppercase text-indigo-500">WordPress REST API & PHP 8.x Safe</span>
        </div>
      </div>
    </div>
  );
};
