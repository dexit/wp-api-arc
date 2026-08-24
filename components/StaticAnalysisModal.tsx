import React, { useState } from 'react';
import { ProjectState } from '../types';
import { 
  runStaticApiAnalysis, 
  AnalysisReport, 
  AnalysisRecommendation 
} from '../services/staticAnalysisService';
import { 
  Activity, 
  Database, 
  Zap, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Copy, 
  Check, 
  Plus, 
  X, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';
import { logger } from '../utils/logger';

interface StaticAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onApplyOptimization?: (recommendation: AnalysisRecommendation) => void;
}

export const StaticAnalysisModal: React.FC<StaticAnalysisModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyOptimization
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const report: AnalysisReport = runStaticApiAnalysis(project);

  const filteredRecommendations = report.recommendations.filter(r => {
    if (filterType === 'all') return true;
    return r.type === filterType || r.category === filterType;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    logger.info('Copied SQL / PHP optimization snippet to clipboard');
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Optimization</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Best Practice</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-zinc-100">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
              <Activity size={22} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Static API & Database Indexing Analysis
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${getScoreColor(report.healthScore)}`}>
                  Score: {report.healthScore}/100
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Automated architectural review for REST response caching, MySQL index optimizations, and query bottlenecks.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Metric Summary Cards */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0b0b0e] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-semibold">Caching Opps</span>
              <Zap size={14} className="text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {report.summary.cachingOpportunities}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500">Transient recommendations</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-semibold">DB Indexes</span>
              <Database size={14} className="text-cyan-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {report.summary.indexingRecommendations}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500">Postmeta index optimizations</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-semibold">Security Guards</span>
              <ShieldAlert size={14} className="text-purple-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {report.summary.securityNotices}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500">Missing route capabilities</div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-semibold">Total Models</span>
              <Layers size={14} className="text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {report.totalPostTypes} <span className="text-xs font-normal text-zinc-500">({report.totalMetaFields} meta)</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-zinc-500">Across {report.totalEndpoints} REST routes</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#09090b] flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
          {[
            { id: 'all', label: `All Recommendations (${report.recommendations.length})` },
            { id: 'caching', label: `Caching (${report.summary.cachingOpportunities})` },
            { id: 'indexing', label: `DB Indexing (${report.summary.indexingRecommendations})` },
            { id: 'security', label: `Security (${report.summary.securityNotices})` },
            { id: 'performance', label: 'Query Performance' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recommendations List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/40 dark:bg-[#09090b] custom-scrollbar">
          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CheckCircle size={36} className="mx-auto text-emerald-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Clean Architecture!</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                No optimization issues or missing indexes detected in this category.
              </p>
            </div>
          ) : (
            filteredRecommendations.map(rec => (
              <div 
                key={rec.id}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(rec.severity)}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {rec.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">
                      <span>Target: {rec.target}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(rec.id, rec.suggestedPhpOrSql)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-zinc-700"
                    >
                      {copiedId === rec.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span>{copiedId === rec.id ? 'Copied' : 'Copy Snippet / SQL'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {rec.description}
                </p>

                <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300">
                  <strong>Why this matters:</strong> {rec.rationale}
                </div>

                {/* Code / SQL Block */}
                <div className="bg-[#18181c] rounded-lg p-3 overflow-x-auto border border-zinc-800 font-mono text-[11px] text-zinc-300 relative custom-scrollbar max-h-44">
                  <pre className="whitespace-pre">{rec.suggestedPhpOrSql}</pre>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 shrink-0">
          <span>Static analysis runs completely client-side with zero external API calls</span>
          <span className="font-mono text-[10px] text-indigo-500 uppercase">WordPress 6.x & MySQL 8.0+ Tuning</span>
        </div>

      </div>
    </div>
  );
};
