import React from 'react';
import { Taxonomy, CustomPostType } from '../types';
import { Trash2, Settings, Box } from 'lucide-react';

interface TaxonomyEditorProps {
  taxonomy: Taxonomy;
  postTypes: CustomPostType[];
  onChange: (updated: Taxonomy) => void;
  onDelete: () => void;
}

export const TaxonomyEditor: React.FC<TaxonomyEditorProps> = ({ taxonomy, postTypes, onChange, onDelete }) => {
  const togglePostType = (slug: string) => {
    const connected = taxonomy.connectedPostTypes.includes(slug)
      ? taxonomy.connectedPostTypes.filter(s => s !== slug)
      : [...taxonomy.connectedPostTypes, slug];
    onChange({ ...taxonomy, connectedPostTypes: connected });
  };

  return (
    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{taxonomy.singularName}</h2>
          <p className="text-slate-400">Taxonomy Configuration</p>
        </div>
        <button 
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Trash2 size={18} />
          Delete Taxonomy
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Settings size={20} className="text-pink-400"/> General Settings
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Singular Name</label>
              <input 
                type="text" 
                value={taxonomy.singularName} 
                onChange={e => onChange({...taxonomy, singularName: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Plural Name</label>
              <input 
                type="text" 
                value={taxonomy.pluralName} 
                onChange={e => onChange({...taxonomy, pluralName: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-1">Slug (Key)</label>
              <input 
                type="text" 
                value={taxonomy.slug} 
                onChange={e => onChange({...taxonomy, slug: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-pink-500 outline-none font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
              <input 
                type="checkbox"
                checked={taxonomy.hierarchical}
                onChange={e => onChange({...taxonomy, hierarchical: e.target.checked})}
                className="rounded bg-slate-700 border-slate-600 text-pink-500 focus:ring-0"
              />
              <div>
                <span className="text-white block font-medium">Hierarchical</span>
                <span className="text-xs text-slate-500">Like Categories (with parents) vs Tags (flat)</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
              <input 
                type="checkbox"
                checked={taxonomy.showInRest}
                onChange={e => onChange({...taxonomy, showInRest: e.target.checked})}
                className="rounded bg-slate-700 border-slate-600 text-pink-500 focus:ring-0"
              />
              <div>
                <span className="text-white block font-medium">Show in REST API</span>
                <span className="text-xs text-slate-500">Expose this taxonomy to the WordPress API</span>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Box size={20} className="text-indigo-400"/> Associated Post Types
          </h3>
          <div className="space-y-2">
            {postTypes.map(pt => (
              <label key={pt.id} className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
                <input 
                  type="checkbox"
                  checked={taxonomy.connectedPostTypes.includes(pt.slug)}
                  onChange={() => togglePostType(pt.slug)}
                  className="rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0"
                />
                <span className="text-slate-300 font-medium">{pt.pluralName}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
