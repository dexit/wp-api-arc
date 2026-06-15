import React, { useState } from 'react';
import { CustomPostType, FieldType, MetaField, Taxonomy } from '../types';
import { DEFAULT_SUPPORTS_OPTIONS } from '../constants';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Link as LinkIcon, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  AlignLeft, 
  Type, 
  Hash, 
  ToggleLeft, 
  List, 
  Box, 
  FolderPlus, 
  Eye, 
  FolderOpen, 
  HelpCircle, 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle, 
  Check, 
  Code,
  FileJson,
  XSquare
} from 'lucide-react';

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
  
  // Custom interactive & developer additions
  const [activeLeftTab, setActiveLeftTab] = useState<'designer' | 'preview'>('designer');
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  
  // Store interactive test rows for repeaters: keyed by field ID. Each contains array of objects representing cells.
  const [mockRows, setMockRows] = useState<Record<string, Array<Record<string, any>>>>({});

  const handleAddMockRow = (fieldId: string, subFields: MetaField[] = []) => {
    const freshRow: Record<string, any> = {};
    subFields.forEach(sf => {
      freshRow[sf.key] = sf.type === FieldType.BOOLEAN ? false : '';
    });
    setMockRows(prev => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] || []), freshRow]
    }));
  };

  const handleUpdateMockRowValue = (fieldId: string, rowIndex: number, key: string, val: any) => {
    setMockRows(prev => {
      const current = [...(prev[fieldId] || [])];
      if (current[rowIndex]) {
        current[rowIndex] = { ...current[rowIndex], [key]: val };
      }
      return { ...prev, [fieldId]: current };
    });
  };

  const handleRemoveMockRow = (fieldId: string, rowIndex: number) => {
    setMockRows(prev => {
      const current = [...(prev[fieldId] || [])];
      current.splice(rowIndex, 1);
      return { ...prev, [fieldId]: current };
    });
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedFields);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedFields(newSet);
  };

  const handleImportSchemaExecute = (overwrite: boolean) => {
    try {
      if (!importJson.trim()) {
        setImportError('Please enter a valid JSON array schema.');
        return;
      }
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        setImportError('Schema must be a valid JSON array of meta fields.');
        return;
      }
      
      const validated: MetaField[] = parsed.map((item, idx) => {
        if (!item.key || !item.label || !item.type) {
          throw new Error(`Item at index ${idx} is missing key, label, or type.`);
        }
        return {
          id: item.id || `field_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
          key: String(item.key),
          label: String(item.label),
          type: item.type as FieldType,
          description: String(item.description || ''),
          required: Boolean(item.required),
          showInRest: item.showInRest !== undefined ? Boolean(item.showInRest) : true,
          targetPostType: item.targetPostType ? String(item.targetPostType) : undefined,
          subFields: Array.isArray(item.subFields) ? item.subFields.map((sub: any, sIdx: number) => ({
            id: sub.id || `sub_${Date.now()}_${idx}_${sIdx}_${Math.random().toString(36).substr(2, 4)}`,
            key: String(sub.key),
            label: String(sub.label),
            type: sub.type as FieldType,
            description: String(sub.description || ''),
            required: Boolean(sub.required),
            showInRest: sub.showInRest !== undefined ? Boolean(sub.showInRest) : true,
          })) : []
        };
      });

      const updatedFields = overwrite ? validated : [...cpt.metaFields, ...validated];
      onChange({ ...cpt, metaFields: updatedFields });
      setShowImport(false);
      setImportJson('');
      setImportError('');
    } catch (err: any) {
      setImportError(`Invalid JSON structure: ${err.message}`);
    }
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
                 
                  <div className="flex items-center justify-between mb-2 mt-1">
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sub-fields</span>
                     <button 
                       onClick={() => addField(field.id)}
                       className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 py-0.5 px-2 rounded hover:bg-zinc-800 transition-colors"
                     >
                        <Plus size={10}/> Add Field
                     </button>
                  </div>
                  <div className="pl-0">
                    {field.subFields && field.subFields.length > 0 ? (
                      renderFields(field.subFields, level + 1)
                    ) : (
                      <div className="text-[10px] text-zinc-600 italic py-2">No sub-fields defined.</div>
                    )}
                  </div>
             </div>
          )}
        </div>
      ));
  }

  const METADATA_PRESETS = [
    {
      name: "SEO Pack",
      desc: "Default meta title, target description, index robots setting.",
      json: `[
  {"key": "seo_title", "label": "SEO Title Override", "type": "string", "description": "Custom Meta Title for search snippets", "required": false},
  {"key": "seo_description", "label": "SEO Description text", "type": "string", "description": "Snippets text to display on Google queries page", "required": false},
  {"key": "seo_noindex", "label": "No Index setting", "type": "boolean", "description": "Disable crawling indices for this document", "required": false}
]`
    },
    {
      name: "E-Commerce Specs",
      desc: "Common product specifics keys - Prices, unique SKU tags, volume levels.",
      json: `[
  {"key": "price_usd", "label": "Regular Price ($)", "type": "number", "description": "Retail price tag amount", "required": true},
  {"key": "sku_code", "label": "SKU Serial Identifier", "type": "string", "description": "Warehouse SKU scanning tag", "required": false},
  {"key": "stock_volume", "label": "Inventory Volume", "type": "integer", "description": "Current quantity in storage", "required": false}
]`
    },
    {
      name: "Estate Property Specs",
      desc: "Real estate metadata profiles - Asking valuations, bedrooms counts, address lines.",
      json: `[
  {"key": "property_price", "label": "Asking Price ($)", "type": "number", "description": "Asking valuation", "required": true},
  {"key": "bedroom_count", "label": "Bedrooms Count", "type": "integer", "description": "Sleep areas", "required": false},
  {"key": "property_address", "label": "Full Physical Location", "type": "string", "description": "Full street and state address details", "required": false}
]`
    },
    {
      name: "ACF Carousel (Repeater)",
      desc: "Infinite sliding items containing hero texts, image source URLs, internal redirs.",
      json: `[
  {
    "key": "carousel_slides",
    "label": "Slideshow Slider Deck",
    "type": "repeater",
    "description": "Infinite custom sliding block items",
    "subFields": [
      {"key": "slide_headline", "label": "Slide Title string", "type": "string", "description": "Main banner overlay"},
      {"key": "slide_image_url", "label": "Media Asset Link", "type": "string", "description": "Full path of image source"},
      {"key": "cta_redirect_url", "label": "Target URL Redirect", "type": "string", "description": "Call to action link"}
    ]
  }
]`
    },
    {
      name: "Customer Review Cards (Repeater)",
      desc: "Repeater fields for testimonials - Author avatars, given star scales, textual block content.",
      json: `[
  {
    "key": "customer_testimonials",
    "label": "Client Review Cards",
    "type": "repeater",
    "description": "Interactive ratings lists",
    "subFields": [
      {"key": "reviewer_name", "label": "Author Name", "type": "string", "description": "Customers display identity"},
      {"key": "stars_rating", "label": "Scale (1-5)", "type": "integer", "description": "Given stars valuation metric"},
      {"key": "testimonial_feedback", "label": "Opinion Text", "type": "string", "description": "Excerpts review contents"}
    ]
  }
]`
    }
  ];

  const getRelationshipDiagnostics = () => {
    const relationships = cpt.metaFields.filter(f => f.type === FieldType.RELATIONSHIP);
    const checks: Array<{
      field: MetaField;
      status: 'ok' | 'warning' | 'error';
      message: string;
      circular: boolean;
    }> = [];

    relationships.forEach(f => {
      if (!f.targetPostType) {
        checks.push({
          field: f,
          status: 'error',
          message: `Connection target is missing. Please select a targeted Custom Post Type CPT in the dropdown.`,
          circular: false
        });
        return;
      }

      const targetPostTypeObj = allPostTypes.find(pt => pt.slug === f.targetPostType);
      if (!targetPostTypeObj) {
        checks.push({
          field: f,
          status: 'warning',
          message: `Target Custom Post Type '${f.targetPostType}' does not exist or was deleted. WP APIs will return incomplete connections.`,
          circular: false
        });
        return;
      }

      const isCircular = targetPostTypeObj.metaFields.some(
        mf => mf.type === FieldType.RELATIONSHIP && mf.targetPostType === cpt.slug
      );

      if (isCircular) {
        checks.push({
          field: f,
          status: 'warning',
          message: `Connected Circular Link: This model connects with '${f.targetPostType}', and '${f.targetPostType}' also references this model back. In custom APIs and WordPress builds, verify your query resolver avoids infinite recursion.`,
          circular: true
        });
      } else {
        checks.push({
          field: f,
          status: 'ok',
          message: `Active relationship mapped smoothly to connected target model '${targetPostTypeObj.singularName}'.`,
          circular: false
        });
      }
    });

    return checks;
  };

  const renderMockInput = (field: MetaField) => {
    switch(field.type) {
      case FieldType.BOOLEAN:
        return (
          <label className="flex items-center gap-2 cursor-pointer select-none py-1">
             <input type="checkbox" className="rounded border-zinc-300 text-blue-600 focus:ring-0 w-4 h-4" />
             <span className="text-xs text-zinc-600">Toggle setting active</span>
          </label>
        );
      case FieldType.INTEGER:
      case FieldType.NUMBER:
        return (
          <input 
            type="number" 
            placeholder="0" 
            className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 w-full max-w-[200px] hover:border-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        );
      case FieldType.RELATIONSHIP:
        const targetSlug = field.targetPostType;
        const targetCpt = allPostTypes.find(pt => pt.slug === targetSlug);
        return (
          <div className="flex flex-col gap-1.5 max-w-[320px]">
             <select className="bg-white border border-zinc-300 text-zinc-700 rounded px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:border-zinc-400">
                <option value="">Select connected {targetCpt ? targetCpt.singularName : 'Item'}...</option>
                <option value="1">Mock {targetCpt ? targetCpt.singularName : 'Resource'} #1 (Active Record)</option>
                <option value="2">Mock {targetCpt ? targetCpt.singularName : 'Resource'} #2 (Draft Copy)</option>
                <option value="3">Mock {targetCpt ? targetCpt.singularName : 'Resource'} #3 (Archived Node)</option>
             </select>
             {targetCpt ? (
               <span className="text-[10px] text-green-600 flex items-center gap-1 font-mono">
                  ● Connected: {targetCpt.pluralName}
               </span>
             ) : (
               <span className="text-[10px] text-red-500 flex items-center gap-1 font-mono">
                  ⚠ Disconnected (Target Post Type missing)
               </span>
             )}
          </div>
        );
      case FieldType.REPEATER:
        const subFields = field.subFields || [];
        const rows = mockRows[field.id] || [];
        return (
          <div className="bg-[#fcfdfd] border border-zinc-200 rounded-lg p-4 shadow-inner w-full">
             <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-100">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">Repeater Meta rows ({rows.length})</span>
                <button 
                  onClick={() => handleAddMockRow(field.id, subFields)}
                  className="bg-purple-50 hover:bg-purple-100/10 text-purple-700 px-2.5 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-colors border border-purple-200"
                >
                   <Plus size={12} /> Add Row Element
                </button>
             </div>

             {subFields.length === 0 ? (
                <div className="text-[10px] text-zinc-400 italic">No subposts configured in the designer yet!</div>
             ) : rows.length === 0 ? (
                <div className="text-[11px] text-zinc-400 bg-zinc-50 border border-dashed text-center py-4 rounded select-none">
                   No row elements mock created. Press <strong>"Add Row Element"</strong> to test fields interactively.
                </div>
             ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs border-collapse">
                      <thead>
                         <tr className="border-b border-zinc-200 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                            {subFields.map(sf => <th key={sf.id} className="py-2 px-2 pb-1">{sf.label}</th>)}
                            <th className="py-2 px-2 pb-1 w-8"></th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                         {rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-zinc-50/50">
                               {subFields.map(sf => (
                                  <td key={sf.id} className="py-2 px-2">
                                     {sf.type === FieldType.BOOLEAN ? (
                                        <input 
                                          type="checkbox" 
                                          checked={!!row[sf.key]} 
                                          onChange={e => handleUpdateMockRowValue(field.id, rowIndex, sf.key, e.target.checked)} 
                                          className="rounded border-zinc-300 text-purple-600 focus:ring-0 w-4 h-4"
                                        />
                                     ) : (
                                        <input 
                                          type={sf.type === FieldType.INTEGER || sf.type === FieldType.NUMBER ? 'number' : 'text'} 
                                          value={row[sf.key] || ''} 
                                          onChange={e => handleUpdateMockRowValue(field.id, rowIndex, sf.key, e.target.value)}
                                          placeholder={sf.label}
                                          className="bg-white border rounded px-2 py-1 text-xs text-zinc-800 w-full max-w-[150px] focus:outline-none"
                                        />
                                     )}
                                  </td>
                               ))}
                               <td className="py-2 px-2 text-center">
                                  <button onClick={() => handleRemoveMockRow(field.id, rowIndex)} className="text-zinc-400 hover:text-red-500 transition-colors">
                                     <Trash2 size={12} />
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
        );
      case FieldType.ARRAY:
        return (
          <input 
            type="text" 
            placeholder="comma, separated, list" 
            className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 w-full max-w-[280px] hover:border-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        );
      default:
        return (
          <input 
            type="text" 
            placeholder="Enter metadata text..." 
            className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 w-full hover:border-zinc-300 focus:border-blue-500 focus:outline-none"
          />
        );
    }
  };

  const renderWPAdminPreview = () => {
    return (
      <div className="bg-[#f0f0f1] text-[#2c3338] rounded-xl border border-zinc-300 overflow-hidden shadow-2xl min-h-[550px] flex flex-col font-sans select-none">
        {/* WP Admin Header Bar */}
        <div className="bg-[#1d2327] text-[#f0f0f1] h-8 px-4 flex items-center justify-between text-[11px] font-normal border-b border-[#3c434a] select-none">
          <div className="flex items-center gap-4">
            <span className="font-bold flex items-center gap-1.5 text-white">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
              <span>WordPress Admin Panel</span>
            </span>
            <span className="text-[#a7aaad] hover:text-white cursor-pointer transition-colors">Visit Portal</span>
            <span className="text-[#a7aaad] hover:text-white cursor-pointer transition-colors flex items-center gap-1">
              <RefreshCw size={10} /> Updates <span className="bg-orange-500 text-white font-bold px-1 rounded-full text-[9px] scale-90">1</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#a7aaad]">Howdy, <strong>admin</strong></span>
            <div className="w-5 h-5 rounded-full bg-indigo-500 border border-slate-700 overflow-hidden flex items-center justify-center text-[10px] text-white">A</div>
          </div>
        </div>

        {/* Workspace panel */}
        <div className="flex flex-1 min-h-[500px]">
          {/* WP Left Dashboard Options */}
          <div className="bg-[#1d2327] text-[#c3c4c7] w-44 p-2 hidden sm:flex flex-col text-[11px] space-y-1 border-r border-[#3c434a] select-none shrink-0">
             <div className="px-2 py-1.5 text-white bg-zinc-800 rounded font-medium cursor-pointer flex items-center gap-2">
                <Settings size={12} /> Dashboard
             </div>
             <div className="px-2 py-1.5 text-zinc-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer flex items-center gap-2">
                <Box size={12} /> Posts
             </div>
             <div className="px-2 py-1.5 bg-[#007cba] text-white font-bold rounded cursor-pointer flex items-center gap-2 shadow shadow-blue-500/20">
                <Box size={12} /> {cpt.pluralName}
             </div>
             <div className="pl-6 py-1 text-[10px] text-[#72aee6] font-medium hover:text-white cursor-pointer">All {cpt.pluralName}</div>
             <div className="pl-6 py-1 text-[10px] text-[#a7aaad] hover:text-white cursor-pointer font-bold">Add New</div>
             
             {cpt.taxonomies.map(tSlug => {
               const taxObj = allTaxonomies.find(t => t.slug === tSlug);
               if (!taxObj) return null;
               return (
                 <div key={tSlug} className="pl-6 py-1 text-[10px] text-zinc-400 hover:text-white cursor-pointer truncate">
                    {taxObj.pluralName}
                 </div>
               );
             })}
             
             <div className="h-px bg-[#3c434a] my-2" />
             <div className="px-2 py-1.5 text-zinc-400 hover:text-[#fff] hover:bg-slate-800 rounded cursor-pointer flex items-center gap-2">
                <Settings size={12} /> Settings
             </div>
          </div>

          {/* Main Edit Screen Container */}
          <div className="flex-1 bg-[#f0f0f1] p-4 sm:p-6 overflow-y-auto max-h-[520px] custom-scrollbar">
             {/* breadcrumbs */}
             <div className="text-[10px] text-zinc-400 mb-2 font-mono flex items-center gap-1">
               <span>{cpt.pluralName}</span> <span>/</span> <span className="font-bold text-zinc-700">Add New Post</span>
             </div>

             <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-[#1d2327]">Add New Post</h1>
                <div className="flex gap-2">
                   <button className="bg-white border border-[#8c8f94] hover:bg-[#f6f7f7] text-[#2271b1] px-2.5 py-1 text-xs font-semibold rounded shadow-sm">Save Draft</button>
                   <button className="bg-[#135e96] hover:bg-[#105182] text-white px-3 py-1 text-xs font-bold rounded shadow-sm">Publish</button>
                </div>
             </div>

             {/* Content Block Columns */}
             <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 text-left">
                {/* Visual Editor Fields */}
                <div className="xl:col-span-3 space-y-4">
                   {/* Title Area */}
                   <div className="bg-white border border-zinc-200 shadow-sm p-4 rounded focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-shadow">
                      <input 
                        type="text" 
                        placeholder="Add Post Title" 
                        className="w-full bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-[20px] font-bold text-slate-800 placeholder-zinc-300 px-0 py-1"
                      />
                      <div className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1 font-mono">
                         Permalink: <span className="text-blue-500 underline cursor-pointer">https://example.com/{cpt.slug}/<span className="font-bold bg-zinc-50 px-1 py-0.5 rounded text-zinc-700">sample-post</span>/</span>
                      </div>
                   </div>

                   {/* Body content block */}
                   <div className="bg-white border border-zinc-200 shadow-sm rounded overflow-hidden">
                      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-zinc-500">
                         <span>WordPress Editor Framework (Gutenberg)</span>
                         <span className="flex items-center gap-1.5 font-mono text-[9px]">
                            <span className="bg-white border px-1.5 py-0.5 rounded">Visual</span>
                            <span className="text-zinc-400 cursor-pointer hover:text-black">Text</span>
                         </span>
                      </div>
                      <div className="p-4 bg-white">
                         <textarea 
                           placeholder="Type / to choose blocks or add custom HTML page script logs here..."
                           className="w-full h-24 text-xs text-zinc-700 placeholder-zinc-300 resize-none focus:outline-none border-0 p-0"
                         />
                      </div>
                   </div>

                   {/* Custom Metas Card panel */}
                   <div className="bg-white border border-zinc-200 shadow-sm rounded overflow-hidden">
                      <div className="bg-[#1d2327] border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
                         <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Layers size={14} className="text-blue-400" />
                            {cpt.singularName} Post Metadata Fields (MetaBox Model)
                         </h2>
                         <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/20 font-mono scale-90">Auto-Generated UI</span>
                      </div>

                      <div className="divide-y divide-zinc-100 p-4 space-y-4">
                         {cpt.metaFields.length === 0 ? (
                            <div className="text-center py-8 text-xs text-zinc-400 italic">
                               No meta fields configured for this Custom Post Type yet. Defined fields will render here.
                            </div>
                         ) : (
                            cpt.metaFields.map(field => {
                               return (
                                 <div key={field.id} className="pt-2 pb-2 block sm:grid sm:grid-cols-12 gap-4 items-start">
                                    <div className="col-span-4 pr-2">
                                       <div className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                                          {field.label}
                                          {field.required && <span className="text-red-500">*</span>}
                                       </div>
                                       {field.description && <div className="text-[10px] text-zinc-400 mt-1 leading-normal">{field.description}</div>}
                                       <div className="text-[9px] font-mono mt-1 text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 w-max rounded border">
                                          meta_key: {field.key}
                                       </div>
                                    </div>
                                    <div className="col-span-8 mt-2 sm:mt-0">
                                       {renderMockInput(field)}
                                    </div>
                                 </div>
                               );
                            })
                         )}
                      </div>
                   </div>
                </div>

                {/* Right side widgets column */}
                <div className="space-y-4 text-xs">
                   <div className="bg-white border border-zinc-200 shadow-sm rounded-lg p-4 text-zinc-600">
                      <h3 className="font-bold text-sm text-[#1d2327] mb-3 pb-2 border-b">Publish Options</h3>
                      <div className="space-y-2">
                         <div className="flex justify-between"><span>Status:</span> <strong className="text-emerald-600">Draft</strong></div>
                         <div className="flex justify-between"><span>Visibility:</span> <strong>Public</strong></div>
                         <div className="flex justify-between"><span>Revisions:</span> <strong>0</strong></div>
                         <div className="flex justify-between"><span>API Node:</span> <strong className="font-mono text-indigo-600 truncate">{cpt.restBase}</strong></div>
                      </div>
                   </div>

                   <div className="bg-white border border-zinc-200 shadow-sm rounded-lg p-4 text-zinc-600">
                      <h3 className="font-bold text-sm text-[#1d2327] mb-3 pb-2 border-b">Connected Taxonomies</h3>
                      {cpt.taxonomies.length === 0 ? (
                         <div className="text-zinc-400 italic">No taxonomies connected.</div>
                      ) : (
                         <div className="space-y-3">
                           {cpt.taxonomies.map(tSlug => {
                              const taxObj = allTaxonomies.find(t => t.slug === tSlug);
                              if (!taxObj) return null;
                              return (
                                <div key={tSlug} className="space-y-1.5">
                                   <label className="font-bold text-[#1d2327] block">{taxObj.pluralName}</label>
                                   <div className="bg-zinc-50 border max-h-24 overflow-y-auto p-1.5 rounded space-y-1">
                                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-600 select-none">
                                         <input type="checkbox" defaultChecked className="rounded border-zinc-300 w-3 h-3 text-blue-600" />
                                         <span>Mock Term A</span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-600 select-none">
                                         <input type="checkbox" className="rounded border-zinc-300 w-3 h-3 text-blue-600" />
                                         <span>Mock Term B</span>
                                      </label>
                                   </div>
                                </div>
                              );
                           })}
                         </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

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
        
        {/* Left Column: Fields & WordPress Preview */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Custom Interactive Left Tab bar */}
           <div className="flex border-b border-zinc-800 pb-px gap-6 mb-4 select-none">
             <button
               onClick={() => { setActiveLeftTab('designer'); setShowImport(false); }}
               className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all relative ${
                 activeLeftTab === 'designer' 
                   ? 'text-white border-b-2 border-indigo-500' 
                   : 'text-zinc-500 hover:text-zinc-300'
               }`}
             >
               <span className="flex items-center gap-1.5">
                  <Settings size={12} />
                  Schema Designer ({cpt.metaFields.length})
               </span>
             </button>
             <button
               onClick={() => { setActiveLeftTab('preview'); setShowImport(false); }}
               className={`pb-3 text-xs uppercase tracking-wider font-bold transition-all relative ${
                 activeLeftTab === 'preview' 
                   ? 'text-white border-b-2 border-indigo-500' 
                   : 'text-zinc-500 hover:text-zinc-300'
               }`}
             >
               <span className="flex items-center gap-1.5">
                  <Eye size={12} />
                  WordPress Mock UI Preview
               </span>
             </button>
           </div>

           {activeLeftTab === 'designer' ? (
              <>
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Data Schema</h3>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setShowImport(!showImport); setImportError(''); }}
                        className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-full transition-all font-medium"
                      >
                         <FileJson size={12} />
                         {showImport ? 'Show Designer' : 'Import Fields'}
                      </button>
                      <button 
                        onClick={() => addField()}
                        className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition-all shadow-lg font-medium"
                      >
                         <Plus size={14} /> Add Field
                      </button>
                   </div>
                </div>
                
                {showImport ? (
                   <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                         <div>
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                               <FileJson size={14} /> Import Meta Fields Schema
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">Import preset industry structures or paste raw metadata models.</p>
                         </div>
                         <button 
                           onClick={() => { setShowImport(false); setImportError(''); }}
                           className="text-zinc-500 hover:text-white text-xs border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded transition-colors"
                         >
                            Cancel
                         </button>
                      </div>

                      {importError && (
                         <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-start gap-2">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{importError}</span>
                         </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                         {/* Presets List */}
                         <div className="md:col-span-4 space-y-2 max-h-[290px] overflow-y-auto pr-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Preconfigured Presets</span>
                            {METADATA_PRESETS.map((preset) => (
                               <button
                                 key={preset.name}
                                 onClick={() => { setImportJson(preset.json); setImportError(''); }}
                                 className="w-full text-left p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg hover:bg-zinc-800/50 transition-all group"
                               >
                                  <div className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors">{preset.name}</div>
                                  <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{preset.desc}</div>
                               </button>
                            ))}
                         </div>

                         {/* Core JSON Field */}
                         <div className="md:col-span-8 flex flex-col space-y-1.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Raw Schema JSON Array</span>
                            <textarea
                              value={importJson}
                              onChange={e => { setImportJson(e.target.value); setImportError(''); }}
                              placeholder={`[\n  {\n    "key": "field_key",\n    "label": "Field Label",\n    "type": "string",\n    "description": "Optional desc..."\n  }\n]`}
                              className="flex-1 w-full h-[220px] bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-indigo-300 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                            />
                         </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800 text-xs">
                         <button
                           onClick={() => handleImportSchemaExecute(false)}
                           className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-full transition-all"
                         >
                            Merge with Active
                         </button>
                         <button
                           onClick={() => handleImportSchemaExecute(true)}
                           className="bg-zinc-950 hover:bg-zinc-900 text-red-400 border border-red-900/30 font-bold px-4 py-2 rounded-full transition-all"
                         >
                            Replace Fields
                         </button>
                      </div>
                   </div>
                ) : (
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
                )}
              </>
           ) : (
              renderWPAdminPreview()
           )}
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

           {/* Relationships Diagnostics Panel */}
           <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-zinc-800">
                 <LinkIcon size={14} className="text-indigo-400" /> Model Connections & Diagnostics
              </h3>
              
              <div className="space-y-3">
                 {getRelationshipDiagnostics().length === 0 ? (
                    <div className="text-xs text-zinc-500 italic leading-relaxed">
                       No relationship fields defined on this resource. Connect post types with standard relationship fields to inspect and safeguard connection integrity.
                    </div>
                 ) : (
                    getRelationshipDiagnostics().map(({ field, status, message, circular }) => (
                       <div key={field.id} className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1">
                             <span className="font-bold text-zinc-300 font-mono text-[11px]">{field.label} ({field.key})</span>
                             <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                               status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                               status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                               'bg-red-500/10 text-red-400 border border-red-500/20'
                             }`}>
                                {status === 'ok' ? 'Connected' : 'Scanner ALERT'}
                             </span>
                          </div>
                          
                          <div className="text-[11px] text-zinc-400 leading-relaxed pt-0.5">
                             {message}
                          </div>

                          {circular && (
                             <div className="flex items-center gap-1 text-[9px] text-yellow-600 font-bold bg-yellow-500/5 px-2 py-1 rounded">
                                <AlertTriangle size={10} /> Infinite loop checked safely.
                             </div>
                          )}
                       </div>
                    ))
                 )}
              </div>
           </div>

        </div>

      </div>
    </div>
  );
};
