import React, { useEffect, useState, useRef } from 'react';
import { ProjectState } from '../types';
import { generateMermaidDiagram } from '../services/diagramService';
import { Network, Copy, Check } from 'lucide-react';
import mermaid from 'mermaid';

interface BlueprintViewProps {
  project: ProjectState;
}

export const BlueprintView: React.FC<BlueprintViewProps> = ({ project }) => {
  const [diagramCode, setDiagramCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ 
        startOnLoad: false, 
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'monospace'
    });
  }, []);

  useEffect(() => {
    const code = generateMermaidDiagram(project);
    setDiagramCode(code);
    
    // Render mermaid
    if (code) {
        const id = `mermaid-${Date.now()}`;
        mermaid.render(id, code).then(({ svg }) => {
            setSvgContent(svg);
        }).catch(err => {
            console.error("Mermaid Render Error", err);
            setSvgContent(''); // Clear on error or show fallback
        });
    }
  }, [project]);

  const handleCopy = () => {
    navigator.clipboard.writeText(diagramCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full p-8 bg-[#0f111a] overflow-auto custom-scrollbar relative flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
             <Network className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">System Blueprint</h2>
            <p className="text-slate-400">Mermaid.js Class Diagram Architecture</p>
          </div>
        </div>
        
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
        >
          {copied ? <Check size={16} className="text-green-500"/> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy Mermaid'}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        
        {/* Visual Preview */}
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-1 relative overflow-hidden flex flex-col min-h-[400px]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 z-10"></div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-[#0f111a] flex items-center justify-center">
                {svgContent ? (
                    <div 
                        dangerouslySetInnerHTML={{ __html: svgContent }} 
                        className="w-full h-full flex items-center justify-center"
                    />
                ) : (
                    <div className="text-slate-500 text-sm">Generating visualization...</div>
                )}
            </div>
        </div>

        {/* Code View */}
        <div className="bg-[#1e1e1e] rounded-xl border border-slate-700 flex flex-col overflow-hidden">
            <div className="bg-[#252526] px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                <span className="text-xs font-mono text-slate-400">architecture.mermaid</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Source</span>
            </div>
            <pre className="flex-1 p-4 overflow-auto custom-scrollbar font-mono text-xs leading-relaxed text-blue-100/80">
                {diagramCode}
            </pre>
        </div>

      </div>
    </div>
  );
};