import React, { useEffect, useState, useRef } from 'react';
import { logger } from '../utils/logger';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface TerminalProps {
  onClose: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = logger.subscribe((entry) => {
      setLogs(prev => [...prev, entry]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  const clearLogs = () => setLogs([]);

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-300';
    }
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2 flex items-center gap-3 cursor-pointer hover:bg-slate-800 z-50"
        onClick={() => setIsMinimized(false)}
      >
        <TerminalIcon size={16} className="text-green-500" />
        <span className="text-xs font-mono text-slate-300">Terminal ({logs.length})</span>
        <ChevronUp size={14} className="text-slate-500" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-64 bg-[#0d0d0d] border-t border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-50 flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-green-500" />
          <span className="text-slate-300 font-bold">System Console</span>
          <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{logs.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearLogs} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400" title="Clear">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-slate-700 rounded text-slate-400" title="Minimize">
            <ChevronDown size={14} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-slate-600 italic">No logs yet. perform an action to see output...</div>
        )}
        {logs.map(log => (
          <div key={log.id} className="flex gap-3 hover:bg-[#1a1a1a] p-0.5 rounded">
            <span className="text-slate-600 w-16 shrink-0">{log.timestamp.toLocaleTimeString().split(' ')[0]}</span>
            <span className={`uppercase w-16 shrink-0 font-bold ${getLevelColor(log.level)}`}>{log.level}</span>
            <span className="text-slate-300 break-all">
              {log.message}
              {log.details && (
                <span className="text-slate-500 block ml-2">
                  {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                </span>
              )}
            </span>
          </div>
        ))}
        <div className="h-2"></div>
      </div>
    </div>
  );
};
