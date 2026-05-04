import React, { useState } from 'react';
import { CustomPostType, FieldType, MetaField, Taxonomy } from '../types';
import { DEFAULT_SUPPORTS_OPTIONS } from '../constants';
import { Plus, Trash2, Settings, Link as LinkIcon, Layers, ChevronRight, ChevronDown, AlignLeft, Type, Hash, ToggleLeft, List, Box, FolderPlus } from 'lucide-react';

interface ResourceEditorProps {
  cpt: CustomPostType;
  allTaxonomies: Taxonomy[];
  allPostTypes?: CustomPostType[];
  onChange: (updatedCpt: CustomPostType) => void;
  onDelete: () => void;
}

const getIconForType = (type: FieldType) => {
  switch(type) {
    case FieldType.STRING: return <Type size={14} className="text-zinc-500"/>;
    case FieldType.INTEGER: 
    case FieldType.NUMBER: return <Hash size={14} className="text-blue-500"/>;
    case FieldType.BOOLEAN: return <ToggleLeft size={14} className="text-green-500"/>;
    case FieldType.RELATIONSHIP: return <LinkIcon size={14} className="text-indigo-500"/>;
    case FieldType.REPEATER: return <Layers size={14} className="text-purple-500"/>;
    case FieldType.ARRAY: return <List size={14} className="text-orange-500"/>;
    default: return <AlignLeft size={14} className="text-zinc-500"/>;
  }
};

export const ResourceEditor: React.FC<ResourceEditorProps> = ({ cpt, allTaxonomies, allPostTypes = [], onChange, onDelete }) => {
  // Store expanded state as a Set of IDs
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedFields);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedFields(newSet);
  };

  const handleFieldChange = (fieldId: string, changes: Partial<MetaField>) => {
    const updateFieldsRecursive = (fields: MetaField[]): MetaField[] => {
      return fields.map(f => {
        if (f.id === fieldId) return { ...f, ...changes };
        if (f.subFields) return { ...f, subFields: updateFieldsRecursive(f.subFields) };
        return f;
      });
    };
    onChange({ ...cpt, metaFields: updateFieldsRecursive(cpt.metaFields) });
  };

  const addField = (parentFieldId?: string) => {
    const newField: MetaField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      key: 'new_field',
      label: 'New Field',
      type: FieldType.STRING,
      description: '',
      required: false,
      showInRest: true,
      subFields: [],
    };

    if (parentFieldId) {
       const addSubField = (fields: MetaField[]): MetaField[] => {
         return fields.map(f => {
           if (f.id === parentFieldId) {
             // Ensure we expand the parent when adding a child
             if (!expandedFields.has(parentFieldId)) {
                // Since state update is async and we are inside a callback, 
                // we might need to handle this side-effect carefully.
                // For now, we will just rely on the user having expanded it or manually expand.
                // Actually, let's force expand in the next render cycle effectively
                setTimeout(() => toggleExpand(parentFieldId), 0);
             }
             return { ...f, subFields: [...(f.subFields || []), newField] };
           }
           if (f.subFields) return { ...f, subFields: addSubField(f.subFields) };
           return f;
         });
       };
       onChange({ ...cpt, metaFields: addSubField(cpt.metaFields) });
    } else {
       onChange({ ...cpt, metaFields: [...cpt.metaFields, newField] });
    }
  };

  const removeField = (id: string) => {
    const removeRecursive = (fields: MetaField[]): MetaField[] => {
      return fields.filter(f => f.id !== id).map(f => ({
        ...f,
        subFields: f.subFields ? removeRecursive(f.subFields) : undefined
      }));
    };
    onChange({ ...cpt, metaFields: removeRecursive(cpt.metaFields) });
  };

  const toggleSupport = (option: string) => {
    const newSupports = cpt.supports.includes(option)
      ? cpt.supports.filter(s => s !== option)
      : [...cpt.supports, option];
    onChange({ ...cpt, supports: newSupports });
  };

  const toggleTaxonomy = (taxSlug: string) => {
    const newTaxonomies = cpt.taxonomies.includes(taxSlug)
      ? cpt.taxonomies.filter(t => t !== taxSlug)
      : [...cpt.taxonomies, taxSlug];
    onChange({ ...cpt, taxonomies: newTaxonomies });
  };

  const renderFields = (fields: MetaField[], level = 0) => {
    return fields.map((field) => (
        <div 
          key={field.id} 
          className={`group relative flex flex-col gap-2 rounded-md transition-all
            ${level === 0 ? 'bg-[#121214] border border-zinc-800 p-3 mb-2' : 'mt-2 border-l-2 border-zinc-700 pl-3'}
          `}
        >
          
          <div className="flex items-start gap-3">
             {/* Icon Handle */}
             <div className="mt-2 text-zinc-600 cursor-grab active:cursor-grabbing">
                {getIconForType(field.type)}
             </div>

             {/* Main Inputs */}
             <div className="flex-1 grid grid-cols-12 gap-3">
                <div className="col-span-3">
                    <input 
                      type="text" 
                      value={field.key}
                      onChange={e => handleFieldChange(field.id, { key: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:border-indigo-500 focus:outline-none placeholder-zinc-600"
                      placeholder="field_key"
                    />
                </div>
                <div className="col-span-3">
                   <select 
                     value={field.type}
                     onChange={e => handleFieldChange(field.id, { type: e.target.value as FieldType })}
                     className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
                   >
                     {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>
                <div className="col-span-6">
                    <input 
                      type="text" 
                      value={field.description}
                      onChange={e => handleFieldChange(field.id, { description: e.target.value })}
                      className="w-full bg-transparent border-b border-zinc-800 focus:border-indigo-500 rounded-none px-0 py-1.5 text-xs text-zinc-400 focus:outline-none placeholder-zinc-700 transition-colors"
                      placeholder="Field description..."
                    />
                </div>
             </div>

             <button onClick={() => removeField(field.id)} className="text-zinc-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14} />
             </button>
          </div>

          {/* Conditional Row */}
          {(field.type === FieldType.RELATIONSHIP || field.type === FieldType.REPEATER || field.required || field.showInRest) && (
             <div className="pl-7 flex items-center gap-4 mt-1">
                {field.type === FieldType.RELATIONSHIP && (
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Connects to</span>
                      <select 
                        value={field.targetPostType || ''}
                        onChange={e => handleFieldChange(field.id, { targetPostType: e.target.value })}
                        className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded px-2 py-0.5 text-[10px] focus:outline-none"
                      >
                        <option value="">Select Model...</option>
                        {allPostTypes.filter(p => p.id !== cpt.id).map(p => (
                          <option key={p.slug} value={p.slug}>{p.singularName}</option>
                        ))}
                      </select>
                   </div>
                )}
                
                <div className="flex gap-3">
                   <label className="flex items-center gap-1.5 cursor-pointer select-none">
                     <input type="checkbox" checked={field.required} onChange={e => handleFieldChange(field.id, { required: e.target.checked })} className="rounded bg-zinc-800 border-zinc-600 text-indigo-500 focus:ring-0 w-3 h-3"/>
                     <span className="text-[10px] text-zinc-400">Required</span>
                   </label>
                   <label className="flex items-center gap-1.5 cursor-pointer select-none">
                     <input type="checkbox" checked={field.showInRest} onChange={e => handleFieldChange(field.id, { showInRest: e.target.checked })} className="rounded bg-zinc-800 border-zinc-600 text-indigo-500 focus:ring-0 w-3 h-3"/>
                     <span className="text-[10px] text-zinc-400">Show in API</span>
                   </label>
                </div>

                {field.type === FieldType.REPEATER && (
                    <button 
                      onClick={() => toggleExpand(field.id)}
                      className={`ml-auto text-[10px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${expandedFields.has(field.id) ? 'bg-purple-500/20 text-purple-300' : 'text-purple-400 hover:text-purple-300'}`}
                    >
                        {expandedFields.has(field.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {expandedFields.has(field.id) ? 'Collapse' : `Sub-fields (${field.subFields?.length || 0})`}
                    </button>
                )}
             </div>
          )}

          {/* Recursive Nested Fields */}
          {field.type === FieldType.REPEATER && expandedFields.has(field.id) && (
             <div className="mt-1 relative">
                 {/* Visual Guide Line */}
                 <div className="absolute left-3 top-0 bottom-4 w-px bg-zinc-800"></div>
                 
                 <div className="pl-0">
                    {field.subFields && field.subFields.length > 0 ? (
                      renderFields(field.subFields, level + 1)
                    ) : (
                      <div className="text-[10px] text-zinc-600 italic pl-6 py-2">No sub-fields defined.</div>
                    )}
                 </div>

                 <button 
                   onClick={() => addField(field.id)}
                   className="ml-6 mt-1 text-xs text-zinc-500 hover:text-purple-400 flex items-center gap-1.5 py-1 px-2 rounded hover:bg-zinc-800/50 transition-colors"
                 >
                    <FolderPlus size={12}/> Add Sub-field
                 </button>
             </div>
          )}
        </div>
      ));
  }

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 custom-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Box className="text-indigo-500" size={24} />
           </div>
           <div>
             <h2 className="text-2xl font-bold text-white tracking-tight">{cpt.singularName}</h2>
             <p className="text-zinc-500 text-sm">Post Type Configuration</p>
           </div>
        </div>
        <button 
          onClick={onDelete}
          className="text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-transparent hover:border-red-500/20"
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Fields */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Data Schema</h3>
              <button 
                onClick={() => addField()}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition-all shadow-lg shadow-indigo-900/20 font-medium"
              >
                <Plus size={14} /> Add Field
              </button>
           </div>
           
           <div className="space-y-2">
              {cpt.metaFields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                   <p className="text-zinc-500 text-sm">No fields defined yet.</p>
                   <button onClick={() => addField()} className="text-indigo-400 text-xs mt-2 hover:underline">Add your first field</button>
                </div>
              ) : (
                renderFields(cpt.metaFields)
              )}
           </div>
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-8">
           
           {/* General Config */}
           <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <Settings size={14} /> General Config
              </h3>
              
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-zinc-500 font-bold mb-1 block">SINGULAR</label>
                        <input type="text" value={cpt.singularName} onChange={e => onChange({...cpt, singularName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-white focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-500 font-bold mb-1 block">PLURAL</label>
                        <input type="text" value={cpt.pluralName} onChange={e => onChange({...cpt, pluralName: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-white focus:border-indigo-500 outline-none" />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] text-zinc-500 font-bold mb-1 block">SLUG (DB KEY)</label>
                    <input type="text" value={cpt.slug} onChange={e => onChange({...cpt, slug: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-white font-mono focus:border-indigo-500 outline-none" />
                 </div>
                 <div>
                    <label className="text-[10px] text-zinc-500 font-bold mb-1 block">REST BASE</label>
                    <input type="text" value={cpt.restBase} onChange={e => onChange({...cpt, restBase: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-white font-mono focus:border-indigo-500 outline-none" />
                 </div>
                 <div>
                    <label className="text-[10px] text-zinc-500 font-bold mb-1 block">DESCRIPTION</label>
                    <textarea value={cpt.description} onChange={e => onChange({...cpt, description: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-white focus:border-indigo-500 outline-none resize-none h-20" />
                 </div>
              </div>
           </div>

           {/* Features */}
           <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-sm">
               <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Supports</h3>
               <div className="flex flex-wrap gap-2">
                  {DEFAULT_SUPPORTS_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleSupport(opt)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors border ${
                        cpt.supports.includes(opt) 
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {opt.replace('-', ' ')}
                    </button>
                  ))}
               </div>
           </div>

           {/* Taxonomies */}
           <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-sm">
               <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Taxonomies</h3>
               <div className="space-y-1">
                  {allTaxonomies.map(tax => (
                    <label key={tax.id} className="flex items-center gap-3 p-2 rounded hover:bg-zinc-900/50 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={cpt.taxonomies.includes(tax.slug)}
                         onChange={() => toggleTaxonomy(tax.slug)}
                         className="rounded bg-zinc-800 border-zinc-600 text-pink-500 focus:ring-0" 
                       />
                       <span className="text-xs text-zinc-300">{tax.pluralName}</span>
                    </label>
                  ))}
                  {allTaxonomies.length === 0 && <span className="text-xs text-zinc-600 italic">No taxonomies available.</span>}
               </div>
           </div>

        </div>

      </div>
    </div>
  );
};
