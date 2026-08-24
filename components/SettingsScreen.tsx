import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, AIProvider, ProjectState } from '../types';
import { GEMINI_MODELS } from '../services/aiService';
import { logger } from '../utils/logger';
import { generateSQLiteDDL, parseSQLiteDDLToProject } from '../services/sqliteGenerator';
import { generatePHP } from '../services/wpGenerator';
import { exportProjectToZip } from '../utils/pluginZipExporter';
import { 
  Settings, Cpu, Cloud, Key, Save, AlertTriangle, Monitor, 
  Download, Upload, Database, Globe, Layers, Trash2, RotateCcw, 
  Copy, Check, FileText, Share2, Eye, EyeOff, Sparkles, Sliders
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  project: ProjectState;
  setProject: (project: ProjectState) => void;
  theme?: 'light' | 'dark';
}

interface LocalSnapshot {
  id: string;
  name: string;
  timestamp: string;
  data: ProjectState;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onSave, project, setProject, theme = 'light' }) => {
  const [localState, setLocalState] = useState<AppSettings>(settings);
  const [localAIAvailable, setLocalAIAvailable] = useState<boolean | null>(null);
  const [localProject, setLocalProject] = useState<ProjectState>(project);
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([]);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlImportText, setSqlImportText] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalProject(project);
  }, [project]);

  useEffect(() => {
    // Load LocalStorage Snapshots
    const saved = localStorage.getItem('wp_api_architect_snapshots');
    if (saved) {
      try {
        setSnapshots(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse snapshots');
      }
    }

    // Check for Chrome Local AI
    if (window.ai) {
      window.ai.languageModel.capabilities().then((cap: any) => {
        setLocalAIAvailable(cap.available === 'readily');
      }).catch(() => setLocalAIAvailable(false));
    } else {
      setLocalAIAvailable(false);
    }
  }, []);

  const saveSnapshotsToStorage = (updated: LocalSnapshot[]) => {
    setSnapshots(updated);
    localStorage.setItem('wp_api_architect_snapshots', JSON.stringify(updated));
  };

  const handleCreateSnapshot = () => {
    if (!newSnapshotName.trim()) return;
    const snap: LocalSnapshot = {
      id: `snap_${Date.now()}`,
      name: newSnapshotName.trim(),
      timestamp: new Date().toLocaleString(),
      data: localProject
    };
    const updated = [snap, ...snapshots];
    saveSnapshotsToStorage(updated);
    setNewSnapshotName('');
    logger.success(`LocalStorage Snapshot "${snap.name}" saved`);
  };

  const handleRestoreSnapshot = (snap: LocalSnapshot) => {
    setProject(snap.data);
    setLocalProject(snap.data);
    logger.success(`Restored project from snapshot "${snap.name}"`);
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    saveSnapshotsToStorage(updated);
    logger.info('Deleted snapshot slot');
  };

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalState(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localState);
    setProject(localProject);
    logger.success('Settings and API project config saved successfully');
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(localProject, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${localProject.name.toLowerCase().replace(/\s+/g, '_')}_project.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    logger.success('Full JSON Project state exported');
  };

  const handleExportMigrationPackage = () => {
    const migrationPayload = {
      format: 'wp-api-architect-migration',
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        projectName: localProject.name,
        namespace: localProject.namespace,
        apiVersion: localProject.apiVersion || 'v1',
        cptCount: localProject.postTypes.length,
        taxonomyCount: localProject.taxonomies.length,
        endpointCount: localProject.customEndpoints.length,
        globalHelperCount: localProject.globalHelpers.length
      },
      project: localProject
    };

    const dataStr = JSON.stringify(migrationPayload, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const fileName = `${localProject.name.toLowerCase().replace(/\s+/g, '_')}_v${localProject.apiVersion || 'v1'}.migration.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
    logger.success(`Migration package "${fileName}" exported successfully`);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let targetProject: ProjectState;

        if (parsed.format === 'wp-api-architect-migration' && parsed.project) {
          targetProject = parsed.project;
          logger.success(`Migration package imported from ${new Date(parsed.exportedAt || Date.now()).toLocaleDateString()}`);
        } else if (parsed.name && Array.isArray(parsed.postTypes)) {
          targetProject = parsed;
          logger.success('Project state imported successfully');
        } else {
          throw new Error('Unrecognized project or migration JSON format');
        }

        setProject(targetProject);
        setLocalProject(targetProject);
      } catch (error: any) {
        logger.error('Failed to import project file', error.message || 'Invalid JSON format');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportSQLite = () => {
    const sql = generateSQLiteDDL(localProject);
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(sql);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${localProject.name.toLowerCase().replace(/\s+/g, '_')}_schema.sql`);
    linkElement.click();
    logger.success('Exported SQLite DDL Dump (.sql)');
  };

  const handleCopySql = () => {
    const sql = generateSQLiteDDL(localProject);
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    logger.info('Copied SQLite DDL to clipboard');
  };

  const handleImportSqlText = () => {
    if (!sqlImportText.trim()) return;
    try {
      const parsed = parseSQLiteDDLToProject(sqlImportText);
      if (parsed.postTypes.length === 0) {
        logger.warning('No CREATE TABLE queries detected in SQL text');
        return;
      }
      const updatedProject = {
        ...localProject,
        postTypes: [...localProject.postTypes, ...parsed.postTypes]
      };
      setProject(updatedProject);
      setLocalProject(updatedProject);
      setSqlModalOpen(false);
      setSqlImportText('');
      logger.success(`Imported ${parsed.postTypes.length} models from SQLite schema`);
    } catch (e) {
      logger.error('Failed to parse SQL schema', String(e));
    }
  };

  const handleExportFlatPhp = () => {
    const php = generatePHP(localProject);
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(php);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `plugin.php`);
    linkElement.click();
    logger.success('Exported flat plugin.php file');
  };

  return (
    <div className="h-full w-full p-6 md:p-10 bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 overflow-auto custom-scrollbar relative transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
              <Settings className="text-indigo-600 dark:text-indigo-400" size={26} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Project & AI Configuration
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400">
                API Versioning, AI Generation Engine, LocalStorage Snapshots, and Full-Stack Import/Export
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all shadow-indigo-600/20"
          >
            <Save size={16} /> Save All Changes
          </button>
        </div>

        {/* API & Versioning Settings */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-zinc-100 mb-2 flex items-center gap-2">
             <Globe size={18} className="text-indigo-500" /> API Namespace & REST Versioning
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
             Configure how routes and schema envelopes are structured across WordPress REST endpoints.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                   PROJECT / PLUGIN NAME
                </label>
                <input 
                  type="text" 
                  value={localProject.name} 
                  onChange={e => setLocalProject({ ...localProject, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
             </div>

             <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                   REST NAMESPACE
                </label>
                <input 
                  type="text" 
                  value={localProject.namespace} 
                  onChange={e => setLocalProject({ ...localProject, namespace: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-indigo-600 dark:text-indigo-400 font-mono text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="corporate"
                />
             </div>

             <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                   API VERSION
                </label>
                <input 
                  type="text" 
                  value={localProject.apiVersion || 'v1'} 
                  onChange={e => setLocalProject({ ...localProject, apiVersion: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-pink-600 dark:text-pink-400 font-mono text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="v1"
                />
             </div>
          </div>

          <div className="mt-5 p-3.5 bg-slate-100 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
             <span className="text-slate-500 dark:text-zinc-400 font-sans">Active REST URL Format:</span>
             <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700">
                /wp-json/{localProject.namespace}/{localProject.apiVersion || 'v1'}/...
             </span>
          </div>
        </div>

        {/* AI Engine & Settings */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-zinc-100 mb-2 flex items-center gap-2">
            <Cpu size={18} className="text-purple-500" /> AI Architect Engine & Models
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
            Configure Google Gemini models, API keys, temperature, and local Chrome execution.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => handleChange('provider', AIProvider.GEMINI)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                localState.provider === AIProvider.GEMINI 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-sm' 
                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Cloud size={18} className={localState.provider === AIProvider.GEMINI ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'} />
                <span className="font-bold text-sm text-slate-900 dark:text-white">Google Gemini Cloud (Recommended)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Deep architectural analysis with high-parameter Gemini models.
              </p>
            </button>

            <button
              onClick={() => handleChange('provider', AIProvider.CHROME_LOCAL)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                localState.provider === AIProvider.CHROME_LOCAL
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm' 
                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={18} className={localState.provider === AIProvider.CHROME_LOCAL ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                <span className="font-bold text-sm text-slate-900 dark:text-white">Chrome Built-in AI (Gemini Nano)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Runs 100% on-device in Google Chrome. No API key required.
              </p>
              {localAIAvailable === false && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={11} /> Chrome Nano not detected on this browser instance.
                </div>
              )}
            </button>
          </div>

          {localState.provider === AIProvider.GEMINI && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1 uppercase">
                    GEMINI MODEL
                  </label>
                  <select
                    value={localState.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {GEMINI_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1 uppercase">
                    CUSTOM GEMINI API KEY (OPTIONAL)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key size={14} className="text-slate-400" />
                    </div>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={localState.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="Uses process.env.GEMINI_API_KEY by default"
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase flex items-center gap-1.5">
                       <Sliders size={13} className="text-purple-500" /> Model Temperature ({localState.temperature})
                    </label>
                    <span className="text-[10px] text-slate-400">0.0 (Strict/Deterministic) - 1.0 (Creative)</span>
                 </div>
                 <input 
                   type="range" 
                   min="0.0" 
                   max="1.0" 
                   step="0.05"
                   value={localState.temperature}
                   onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                   className="w-full accent-purple-600 cursor-pointer"
                 />
              </div>
            </div>
          )}
        </div>

        {/* Full Import / Export Center (Migration JSON, SQLite, Flat File, ZIP) */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-zinc-100 mb-2 flex items-center gap-2">
            <Download size={18} className="text-cyan-500" /> Export, Import & Migration Center
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
             Export or import full project states, migration packages, SQLite schemas, or production plugin zips.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* JSON Import/Export */}
             <div className="p-5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
                <div>
                   <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                      JSON STATE & MIGRATION PACKAGE
                   </span>
                   <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Export portable snapshot with version headers or raw state JSON.
                   </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                   <button 
                     onClick={handleExportMigrationPackage}
                     className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                     title="Export structured migration file (.migration.json)"
                   >
                      <Share2 size={14} /> Export Migration (.json)
                   </button>
                   <button 
                     onClick={handleExportJSON}
                     className="py-2.5 px-3 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs text-slate-800 dark:text-zinc-200 font-medium flex items-center justify-center gap-1.5 transition-colors"
                   >
                      <Download size={14} /> Raw JSON
                   </button>
                   <input 
                     type="file" 
                     accept=".json,.migration.json" 
                     ref={fileInputRef} 
                     onChange={handleImportJSON} 
                     className="hidden" 
                   />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="py-2.5 px-3 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                   >
                      <Upload size={14} /> Import File
                   </button>
                </div>
             </div>

             {/* SQLite DDL & Plugins */}
             <div className="p-5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
                <div>
                   <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                      SQLITE DDL & WORDPRESS PLUGIN
                   </span>
                   <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      Relational SQL table statements or direct production zip plugin download.
                   </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                   <button 
                     onClick={handleExportSQLite}
                     className="flex-1 py-2.5 px-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs text-slate-800 dark:text-zinc-200 font-medium flex items-center justify-center gap-1 transition-colors"
                   >
                      <Database size={13} className="text-cyan-500" /> SQLite DDL (.sql)
                   </button>
                   <button 
                     onClick={() => setSqlModalOpen(true)}
                     className="py-2.5 px-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-1 transition-colors"
                   >
                      <Upload size={13} /> Import SQL
                   </button>
                   <button 
                     onClick={handleExportFlatPhp}
                     className="py-2.5 px-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 rounded-lg text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center justify-center gap-1 transition-colors"
                   >
                      <FileText size={13} /> plugin.php
                   </button>
                   <button 
                     onClick={() => exportProjectToZip(localProject)}
                     className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                   >
                      <Download size={13} /> Download .ZIP
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* LocalStorage Backup Snapshots */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-zinc-100 mb-2 flex items-center gap-2">
             <Layers size={18} className="text-emerald-500" /> LocalStorage Offline Snapshots
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
             Save offline snapshots in your browser and switch between versions instantly without uploading files.
          </p>

          <div className="flex gap-3 mb-6">
             <input 
               type="text" 
               value={newSnapshotName} 
               onChange={e => setNewSnapshotName(e.target.value)}
               placeholder="Snapshot label (e.g. Production Candidate v1.0)..."
               className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
             />
             <button
               onClick={handleCreateSnapshot}
               className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-2 shadow-sm"
             >
               <Save size={15} /> Save Snapshot
             </button>
          </div>

          <div className="space-y-2">
             {snapshots.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 dark:text-zinc-600 border border-dashed border-slate-300 dark:border-zinc-800 rounded-xl">
                   No browser snapshots saved yet. Create your first snapshot above.
                </div>
             )}

             {snapshots.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800">
                   <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 block">{s.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                        {s.timestamp} • {s.data.postTypes.length} Models • {s.data.customEndpoints.length} Routes • {s.data.globalHelpers?.length || 0} Logic Hooks
                      </span>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleRestoreSnapshot(s)}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                         <RotateCcw size={12} /> Restore
                      </button>
                      <button 
                        onClick={() => handleDeleteSnapshot(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete snapshot"
                      >
                         <Trash2 size={15} />
                      </button>
                   </div>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* SQL Import Modal */}
      {sqlModalOpen && (
         <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative space-y-4">
               <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                     <Database size={16} className="text-amber-500" /> Import SQLite DDL Schema
                  </h3>
                  <button onClick={() => setSqlModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
               </div>
               <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Paste SQLite <code>CREATE TABLE</code> statements below. Tables and columns will be converted into Custom Post Types and Meta Fields automatically.
               </p>
               <textarea
                 value={sqlImportText}
                 onChange={e => setSqlImportText(e.target.value)}
                 rows={8}
                 placeholder={`CREATE TABLE \`wp_product\` (\n  \`id\` INTEGER PRIMARY KEY,\n  \`post_title\` TEXT NOT NULL,\n  \`price\` REAL,\n  \`sku\` TEXT\n);`}
                 className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-amber-700 dark:text-amber-300 focus:outline-none focus:border-amber-500"
               />
               <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setSqlModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-semibold">Cancel</button>
                  <button onClick={handleImportSqlText} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold">Parse SQL Schema</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
