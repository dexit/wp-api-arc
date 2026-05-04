import React from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface EditorModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const EditorModal: React.FC<EditorModalProps> = ({ title, isOpen, onClose, children }) => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={`relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-out overflow-hidden ${
        isMaximized ? 'w-full h-full' : 'w-full max-w-6xl h-[85vh]'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-500 rounded-full" />
            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-red-900/40 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
        
        {/* Footer / Status */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 text-[10px] text-slate-500 flex justify-between items-center font-mono uppercase tracking-widest">
           <span>Live Editor Session</span>
           <span className="flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
             Synced to Core
           </span>
        </div>
      </div>
    </div>
  );
};