import React, { useState, useEffect, useRef } from 'react';
import { ProjectState } from '../types';
import { generateOpenAPI, generatePHP, generatePackageJSON, generateComposerJSON, generatePlaygroundBlueprint } from '../services/wpGenerator';
import { generateSeederPHP } from '../services/dataGenerator';
import { Copy, Check, FileCode, FileJson, Package, PlayCircle, Database, ExternalLink, Globe, Download } from 'lucide-react';
import { exportProjectToZip } from '../utils/pluginZipExporter';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-bash';

interface CodePreviewProps {
  project: ProjectState;
  initialTab?: 'openapi' | 'php' | 'pkg' | 'composer' | 'blueprint' | 'seeder' | 'playground';
}

export const CodePreview: React.FC<CodePreviewProps> = ({ project, initialTab = 'openapi' }) => {
  const [tab, setTab] = useState<'openapi' | 'php' | 'pkg' | 'composer' | 'blueprint' | 'seeder' | 'playground'>(initialTab);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  let content = "";
  let language = "json";
  let playgroundUrl = "";
  
  if (tab === 'playground') {
      const blueprint = generatePlaygroundBlueprint(project);
      const encoded = JSON.stringify(JSON.parse(blueprint)); // minified
      playgroundUrl = `https://playground.wordpress.net/#${encoded}`;
  } else {
    switch(tab) {
        case 'openapi': 
            content = generateOpenAPI(project); 
            language = "json";
            break;
        case 'php': 
            content = generatePHP(project); 
            language = "php";
            break;
        case 'pkg': 
            content = generatePackageJSON(project); 
            language = "json";
            break;
        case 'composer': 
            content = generateComposerJSON(project); 
            language = "json";
            break;
        case 'blueprint': 
            content = generatePlaygroundBlueprint(project); 
            language = "json";
            break;
        case 'seeder': 
            content = generateSeederPHP(project); 
            language = "php";
            break;
    }
  }

  useEffect(() => {
      if (codeRef.current && tab !== 'playground') {
          // Reset class for Prism
          codeRef.current.className = `language-${language}`;
          Prism.highlightElement(codeRef.current);
      }
  }, [content, tab, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlaygroundLaunch = () => {
     if (tab === 'playground') {
         window.open(playgroundUrl, '_blank');
     } else {
        const blueprint = generatePlaygroundBlueprint(project);
        const fragment = `#${JSON.stringify(JSON.parse(blueprint))}`;
        window.open(`https://playground.wordpress.net/${fragment}`, '_blank');
     }
  };

  const tabs = [
    { id: 'playground', label: 'Live Preview', icon: Globe, color: 'text-white', activeBg: 'bg-indigo-600' },
    { id: 'openapi', label: 'openapi.json', icon: FileJson, color: 'text-blue-400', activeBg: 'bg-blue-500/10 border-blue-500/30' },
    { id: 'php', label: 'plugin.php', icon: FileCode, color: 'text-purple-400', activeBg: 'bg-purple-500/10 border-purple-500/30' },
    { id: 'pkg', label: 'package.json', icon: Package, color: 'text-green-400', activeBg: 'bg-green-500/10 border-green-500/30' },
    { id: 'composer', label: 'composer.json', icon: Package, color: 'text-yellow-400', activeBg: 'bg-yellow-500/10 border-yellow-500/30' },
    { id: 'seeder', label: 'seeder.php', icon: Database, color: 'text-pink-400', activeBg: 'bg-pink-500/10 border-pink-500/30' },
    { id: 'blueprint', label: 'blueprint.json', icon: PlayCircle, color: 'text-blue-500', activeBg: 'bg-blue-600/10 border-blue-600/30' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-lg transition-all border border-transparent whitespace-nowrap ${
                tab === t.id 
                ? `${t.activeBg} ${t.color}` 
                : 'text-slate-400 hover:bg-[#333] hover:text-slate-200'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
           <button
             onClick={() => exportProjectToZip(project)}
             className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 hover:border-indigo-500/50 px-3 py-1.5 rounded transition-all font-medium"
             title="Download full plugin source code as a ZIP archive"
           >
             <Download size={14} className="text-indigo-400" />
             Export Plugin ZIP
           </button>
           {(tab === 'blueprint' || tab === 'playground') && (
              <button
                onClick={handlePlaygroundLaunch}
                className="flex items-center gap-2 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded transition-colors shadow-lg shadow-blue-500/20 font-medium"
              >
                <ExternalLink size={14} />
                Open in New Tab
              </button>
           )}
          {tab !== 'playground' && (
            <button 
                onClick={handleCopy}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded bg-[#333] hover:bg-[#444] transition-colors"
            >
                {copied ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
         {tab === 'playground' ? (
             <div className="w-full h-full bg-[#f0f0f1]">
                 <iframe 
                    src={playgroundUrl} 
                    className="w-full h-full border-0"
                    title="WordPress Playground"
                    loading="lazy"
                 />
             </div>
         ) : (
             <div className="w-full h-full overflow-auto p-0 custom-scrollbar bg-[#1d1f21]">
                {tab === 'blueprint' && (
                    <div className="absolute top-4 right-8 bg-[#252526] border border-[#444] p-3 rounded-lg max-w-sm text-xs text-slate-400 z-10 shadow-xl">
                    <p className="mb-2"><strong className="text-white">What is this?</strong></p>
                    <p>This blueprint allows you to instantly spin up a real WordPress instance in your browser running your generated plugin code.</p>
                    </div>
                )}
                {tab === 'seeder' && (
                    <div className="absolute top-4 right-8 bg-[#252526] border border-[#444] p-3 rounded-lg max-w-sm text-xs text-slate-400 z-10 shadow-xl">
                    <p className="mb-2"><strong className="text-pink-400">Data Seeder</strong></p>
                    <p>Drop this file into your WordPress root and run it via CLI to populate 5 dummy posts for each Custom Post Type.</p>
                    <code className="block mt-2 bg-black p-1 rounded border border-zinc-700 text-green-400">wp eval-file seeder.php</code>
                    </div>
                )}
                <pre className={`!m-0 !p-6 !bg-transparent text-sm leading-relaxed font-mono language-${language}`}>
                    <code ref={codeRef} className={`language-${language}`}>{content}</code>
                </pre>
             </div>
         )}
      </div>
    </div>
  );
};