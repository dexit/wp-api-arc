import React, { useState } from 'react';
import { EndpointParameter } from '../types';
import { Sparkles, Code2, AlertCircle, Check, X, ArrowRight } from 'lucide-react';

interface JsonPayloadImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parameters: EndpointParameter[]) => void;
}

export const JsonPayloadImporterModal: React.FC<JsonPayloadImporterModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [jsonInput, setJsonInput] = useState<string>(`{\n  "title": "Sample Post Title",\n  "content": "This is sample article content...",\n  "author_id": 42,\n  "price": 149.99,\n  "is_published": true,\n  "tags": ["wordpress", "rest-api", "generator"],\n  "contact": {\n    "email": "developer@example.com",\n    "website": "https://developer.wordpress.org"\n  }\n}`);
  const [error, setError] = useState<string | null>(null);
  const [parsedParams, setParsedParams] = useState<EndpointParameter[]>([]);

  if (!isOpen) return null;

  const inferType = (val: any): { type: string; subFields?: EndpointParameter[] } => {
    if (typeof val === 'number') {
      return { type: Number.isInteger(val) ? 'integer' : 'number' };
    }
    if (typeof val === 'boolean') {
      return { type: 'boolean' };
    }
    if (Array.isArray(val)) {
      return { type: 'array' };
    }
    if (val !== null && typeof val === 'object') {
      const subProps: EndpointParameter[] = Object.entries(val).map(([k, v]) => ({
        id: `sub_${k}_${Math.random().toString(36).substring(2, 6)}`,
        key: k,
        type: typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v === 'boolean' ? 'boolean' : 'string',
        required: true,
        description: `Nested property ${k}`
      }));
      return { type: 'object', subFields: subProps };
    }
    if (typeof val === 'string') {
      if (val.includes('@') && val.includes('.')) return { type: 'email' };
      if (val.startsWith('http://') || val.startsWith('https://')) return { type: 'url' };
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) return { type: 'date-time' };
      return { type: 'string' };
    }
    return { type: 'string' };
  };

  const handleAnalyze = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('JSON root must be an Object (e.g. { "field": "value" })');
        setParsedParams([]);
        return;
      }

      setError(null);
      const params: EndpointParameter[] = Object.entries(parsed).map(([key, val]) => {
        const { type, subFields } = inferType(val);
        return {
          id: `param_${key}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          key,
          type,
          required: true,
          description: `Auto-inferred from JSON payload (${type})`,
          schemaProperties: subFields,
        };
      });

      setParsedParams(params);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON syntax');
      setParsedParams([]);
    }
  };

  const handleApply = () => {
    if (parsedParams.length > 0) {
      onImport(parsedParams);
      onClose();
    } else {
      handleAnalyze();
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-[#18181b] border border-zinc-700/80 rounded-2xl w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Smart JSON Body & Schema Importer</h3>
              <p className="text-xs text-zinc-400">Paste sample JSON request payload to auto-derive typed REST parameters & validation schemas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 size={13} className="text-pink-400" />
                <span>JSON Request Body Sample</span>
              </label>
              <button
                type="button"
                onClick={handleAnalyze}
                className="text-xs font-semibold text-pink-400 hover:text-pink-300 bg-pink-950/60 hover:bg-pink-900/80 border border-pink-800/60 px-2.5 py-1 rounded transition-colors"
              >
                Analyze Schema
              </button>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                if (error) setError(null);
              }}
              rows={8}
              className="w-full bg-[#121214] border border-zinc-700/80 rounded-xl p-3 font-mono text-xs text-pink-200 focus:border-pink-500 focus:outline-none custom-scrollbar leading-relaxed"
              placeholder='{ "key": "value" }'
            />

            {error && (
              <div className="mt-2 p-2.5 bg-rose-950/50 border border-rose-800/60 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Inferred Schema Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Inferred REST Parameters {parsedParams.length > 0 && `(${parsedParams.length})`}
              </span>
              {parsedParams.length === 0 && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                >
                  Click 'Analyze Schema' to parse
                </button>
              )}
            </div>

            {parsedParams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {parsedParams.map((p, idx) => (
                  <div 
                    key={idx} 
                    className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-pink-300 truncate">{p.key}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          p.type === 'integer' || p.type === 'number' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          p.type === 'boolean' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          p.type === 'array' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          p.type === 'object' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          p.type === 'email' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                          p.type === 'url' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}>
                          {p.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{p.description}</p>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono bg-zinc-950 px-1.5 py-0.5 rounded shrink-0">required</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                Paste JSON payload above and click Analyze to review parameters before importing.
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-between items-center bg-zinc-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAnalyze}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Re-Analyze
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-xs font-semibold text-white rounded-lg bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-900/30 transition-all flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Import {parsedParams.length > 0 ? `${parsedParams.length} Parameters` : 'Schema'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
