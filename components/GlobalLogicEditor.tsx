import React, { useState } from 'react';
import { ProjectState, GlobalHelper } from '../types';
import { CodeEditor } from './CodeEditor';
import { Braces, Plus, Trash2, FunctionSquare } from 'lucide-react';

interface GlobalLogicEditorProps {
  project: ProjectState;
  onUpdate: (helper: GlobalHelper) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export const GlobalLogicEditor: React.FC<GlobalLogicEditorProps> = ({ project, onUpdate, onAdd, onDelete }) => {
  const [selectedId, setSelectedId] = useState<string | null>(project.globalHelpers?.[0]?.id || null);

  const selectedHelper = project.globalHelpers.find(h => h.id === selectedId);

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#09090b]">
      {/* Sidebar List */}
      <div className="w-full md:w-64 bg-[#121214] border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
           <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <Braces size={16} /> Global Logic
           </div>
           <button 
             onClick={onAdd}
             className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-indigo-400 transition-colors"
             title="Add Helper Function"
           >
             <Plus size={16} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {project.globalHelpers.map(helper => (
             <button
               key={helper.id}
               onClick={() => setSelectedId(helper.id)}
               className={`w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 transition-all ${
                 selectedId === helper.id 
                 ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/20' 
                 : 'text-zinc-400 hover:bg-zinc-900'
               }`}
             >
               <FunctionSquare size={16} className={selectedId === helper.id ? 'text-indigo-400' : 'text-zinc-600'} />
               <div className="flex-1 min-w-0">
                 <div className="text-xs font-mono truncate">{helper.name}</div>
                 <div className="text-[10px] text-zinc-500 truncate">{helper.parameters || '()'}</div>
               </div>
             </button>
           ))}
           {project.globalHelpers.length === 0 && (
             <div className="text-center py-8 text-zinc-600 text-xs italic">
                No helper functions yet.
             </div>
           )}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden">
        {selectedHelper ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Config Header */}
            <div className="border-b border-zinc-800 p-6 bg-[#09090b]">
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Function Definition</h2>
                    <p className="text-zinc-500 text-sm">Define a reusable PHP function available throughout your plugin.</p>
                 </div>
                 <button 
                   onClick={() => onDelete(selectedHelper.id)}
                   className="text-red-400 hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs"
                 >
                   <Trash2 size={14} /> Delete
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Function Name</label>
                     <div className="flex items-center">
                       <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-500 px-3 py-2 rounded-l text-xs font-mono">function</span>
                       <input 
                         type="text" 
                         value={selectedHelper.name}
                         onChange={(e) => onUpdate({ ...selectedHelper, name: e.target.value })}
                         className="flex-1 bg-zinc-900 border border-zinc-700 rounded-r px-3 py-2 text-indigo-300 font-mono text-sm focus:border-indigo-500 outline-none"
                         placeholder="my_helper_function"
                       />
                     </div>
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Parameters</label>
                     <div className="flex items-center">
                       <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-500 px-3 py-2 rounded-l text-xs font-mono">(</span>
                       <input 
                         type="text" 
                         value={selectedHelper.parameters}
                         onChange={(e) => onUpdate({ ...selectedHelper, parameters: e.target.value })}
                         className="flex-1 bg-zinc-900 border border-zinc-700 rounded-r px-3 py-2 text-orange-300 font-mono text-sm focus:border-orange-500 outline-none"
                         placeholder="$arg1, $arg2 = null"
                       />
                       <span className="ml-2 text-zinc-500 font-mono">)</span>
                     </div>
                  </div>
               </div>
               <div>
                   <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Description</label>
                   <input 
                      type="text" 
                      value={selectedHelper.description}
                      onChange={(e) => onUpdate({ ...selectedHelper, description: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-300 text-xs focus:border-zinc-500 outline-none"
                      placeholder="What does this function do?"
                   />
               </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 p-6 min-h-0 flex flex-col">
               <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                 <Braces size={12} /> Function Body (PHP)
               </label>
               <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
                 <CodeEditor 
                   value={selectedHelper.phpCode}
                   onChange={(val) => onUpdate({ ...selectedHelper, phpCode: val })}
                   parameters={[]} // Global helpers manage their own params in the input above
                   postTypes={project.postTypes}
                 />
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
             <div className="p-4 bg-zinc-900 rounded-full mb-3">
               <Braces size={32} />
             </div>
             <p className="text-sm">Select or create a function to start coding.</p>
          </div>
        )}
      </div>
    </div>
  );
};
