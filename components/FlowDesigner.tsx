import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ProjectState, ResourceType, ContextMenuState, FieldType } from '../types';
import { Network, Database, Box, Edit, Trash2, Copy, Move, Link as LinkIcon, Key, Table, List, ZoomIn, ZoomOut, Grid, Maximize, Tag, Code, Braces, Workflow, Sun, Moon, Info, HelpCircle, Layers, ArrowRight } from 'lucide-react';

interface FlowDesignerProps {
  project: ProjectState;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSelect: (type: ResourceType, id: string) => void;
  onDelete: (type: ResourceType, id: string) => void;
  onDuplicate: (type: ResourceType, id: string) => void;
  onAdd: (type: ResourceType) => void;
  onConnect: (source: { type: ResourceType, id: string }, target: { type: ResourceType, id: string }) => void;
}

const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.abs(x2 - x1);
  const curvature = Math.max(dx * 0.5, 60);
  return `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;
};

// --- Sub Components ---

const NodePort = React.memo(({ type, id, portType, style, onStartConnection, onEndConnection, isLight }: any) => (
  <div 
    className={`absolute w-3.5 h-3.5 rounded-full border-2 cursor-crosshair hover:scale-150 transition-transform z-50 shadow-sm ${
      portType === 'source' 
        ? (isLight ? 'bg-slate-300 border-slate-600 hover:bg-indigo-600 -right-1.5' : 'bg-zinc-500 border-zinc-900 hover:bg-white -right-1.5') 
        : (isLight ? 'bg-slate-400 border-slate-700 hover:bg-indigo-600 -left-1.5' : 'bg-zinc-600 border-zinc-900 hover:bg-white -left-1.5')
    }`}
    style={style}
    onMouseDown={(e) => onStartConnection(e, type, id, portType)}
    onMouseUp={(e) => onEndConnection(e, type, id)}
  />
));

const EndpointNode = React.memo(({ 
    id, 
    data, 
    x, 
    y, 
    onDragStart, 
    onSelect, 
    onContextMenu, 
    onStartConnection, 
    onEndConnection,
    hoveredCptId,
    onHover,
    postTypes,
    isLight
}: any) => {
    const hasDTO = data.parameters && data.parameters.length > 0;
    const hasStorage = data.storage?.enabled;
    const hasLogic = data.customPhp && data.customPhp.trim().length > 0;
    const isETL = hasStorage && hasLogic;

    const isConnectedToHoveredCpt = useMemo(() => {
        if (!hoveredCptId) return false;
        const hoveredCptObj = postTypes?.find((c: any) => c.id === hoveredCptId);
        return data.storage?.enabled && data.storage.targetCptSlug === hoveredCptObj?.slug;
    }, [hoveredCptId, data.storage, postTypes]);

    return (
        <div
            id={`node-endpoint-${id}`}
            className={`absolute w-[280px] rounded-xl border select-none transition-[border-color,box-shadow,ring,background-color] duration-150 ${
                isLight 
                  ? 'bg-white text-slate-800 border-slate-200/90 shadow-md shadow-slate-200/80 hover:border-emerald-400' 
                  : 'bg-[#121214] text-zinc-100 border-zinc-800 shadow-2xl hover:border-emerald-500/50'
            } ${
                isConnectedToHoveredCpt 
                    ? (isLight ? 'border-emerald-500 ring-2 ring-emerald-400/40 shadow-emerald-200 z-40' : 'border-emerald-500 shadow-emerald-500/20 scale-[1.02] z-40 ring-1 ring-emerald-400') 
                    : ''
            }`}
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'endpoint', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('endpoint', id); }}
            onContextMenu={(e) => onContextMenu(e, 'endpoint', id)}
            onMouseEnter={() => onHover && onHover(id)}
            onMouseLeave={() => onHover && onHover(null)}
        >
            <NodePort type="endpoint" id={id} portType="source" style={{ top: 48 }} onStartConnection={onStartConnection} onEndConnection={onEndConnection} isLight={isLight} />
            
            <div className={`px-3 py-2 border-b flex items-center justify-between rounded-t-xl ${
                isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        data.method === 'GET' ? (isLight ? 'bg-blue-100 text-blue-700 font-extrabold' : 'bg-blue-500/20 text-blue-400') : 
                        data.method === 'POST' ? (isLight ? 'bg-emerald-100 text-emerald-700 font-extrabold' : 'bg-green-500/20 text-green-400') : 
                        (isLight ? 'bg-amber-100 text-amber-700 font-extrabold' : 'bg-orange-500/20 text-orange-400')
                    }`}>
                        {data.method}
                    </span>
                    <span className={`text-xs font-bold font-mono truncate ${isLight ? 'text-slate-800' : 'text-zinc-200'}`} title={data.route}>{data.route}</span>
                </div>
                <Network size={14} className={isLight ? 'text-emerald-600 shrink-0' : 'text-emerald-400 shrink-0'} />
            </div>

            <div className="p-2 space-y-1">
                {hasDTO && (
                    <div className={`mb-1.5 px-2 py-0.5 rounded-sm w-fit border ${
                        isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                    }`}>
                        <span className="text-[8px] font-bold uppercase tracking-widest">DTO SCHEMA</span>
                    </div>
                )}
                {!hasDTO && <div className={`pl-1 text-[10px] italic ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>No parameters</div>}
                
                {data.parameters.slice(0,4).map((p: any) => {
                    const isMapped = data.storage?.enabled && data.storage.fieldMapping && data.storage.fieldMapping[p.key];
                    return (
                        <div 
                            key={p.id} 
                            className={`flex justify-between items-center px-2 py-1 rounded border transition-colors ${
                                p.required 
                                    ? (isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/20') 
                                    : (isLight ? 'bg-slate-50 border-slate-100 hover:border-slate-200' : 'bg-zinc-900/30 border-transparent hover:border-zinc-800')
                            }`}
                        >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                {p.required && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="Required parameter" />}
                                <span className={`text-[10px] font-mono leading-tight truncate ${
                                    p.required 
                                        ? (isLight ? 'text-emerald-900 font-bold' : 'text-emerald-200 font-semibold') 
                                        : (isLight ? 'text-slate-700' : 'text-zinc-300/80')
                                }`}>
                                    {p.key}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{p.type}</span>
                                {isMapped && (
                                    <LinkIcon size={10} className={isLight ? 'text-emerald-600' : 'text-emerald-400'} title={`Mapped to CPT: ${data.storage.fieldMapping[p.key]}`} />
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {(hasStorage || hasLogic) && (
                    <div className={`mt-2 pt-2 border-t space-y-1.5 ${isLight ? 'border-slate-200' : 'border-zinc-800/50'}`}>
                        {isETL && (
                             <div className={`flex items-center gap-2 text-[9px] p-1.5 rounded border font-medium ${
                                 isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-900/10 text-purple-400 border-purple-900/20'
                             }`}>
                                <Workflow size={11} className="shrink-0" />
                                <span className="font-bold tracking-wide">ETL PIPELINE</span>
                             </div>
                        )}
                        {hasStorage && !isETL && (
                            <div className={`flex items-center gap-2 text-[9px] p-1.5 rounded border ${
                                isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-green-900/10 text-green-400 border-green-900/20'
                            }`}>
                                <Database size={11} className="shrink-0" />
                                Writes to: <span className="font-bold">{data.storage.targetCptSlug}</span>
                            </div>
                        )}
                        {hasLogic && !isETL && (
                            <div className={`flex items-center gap-2 text-[9px] p-1.5 rounded border font-medium ${
                                isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-900/10 text-indigo-400 border-indigo-900/20'
                            }`}>
                                <Code size={11} className="shrink-0" />
                                <span className="font-bold tracking-wide">CUSTOM LOGIC</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

const CPTNode = React.memo(({ 
    id, 
    data, 
    x, 
    y, 
    onDragStart, 
    onSelect, 
    onContextMenu, 
    onStartConnection, 
    onEndConnection,
    connectedEndpoints,
    hoveredEndpointId,
    onHover,
    customEndpoints,
    isLight
}: any) => {
    const isConnectedToHoveredEndpoint = useMemo(() => {
        if (!hoveredEndpointId) return false;
        const hoveredEp = customEndpoints?.find((e: any) => e.id === hoveredEndpointId);
        return hoveredEp?.storage?.enabled && hoveredEp.storage.targetCptSlug === data.slug;
    }, [hoveredEndpointId, data.slug, customEndpoints]);

    const cptEndpoints = useMemo(() => {
        return (connectedEndpoints || []).filter((ep: any) => ep.storage?.enabled && ep.storage.targetCptSlug === data.slug);
    }, [connectedEndpoints, data.slug]);

    return (
        <div
            id={`node-cpt-${id}`}
            className={`absolute w-[280px] rounded-xl border select-none transition-[border-color,box-shadow,ring,background-color] duration-150 ${
                isLight 
                  ? 'bg-white text-slate-800 border-slate-200/90 shadow-md shadow-slate-200/80 hover:border-indigo-400' 
                  : 'bg-[#121214] text-zinc-100 border-zinc-800 shadow-2xl hover:border-indigo-500/50'
            } ${
                isConnectedToHoveredEndpoint 
                    ? (isLight ? 'border-indigo-600 ring-2 ring-indigo-400/40 shadow-indigo-200 z-40' : 'border-indigo-500 shadow-indigo-500/20 scale-[1.02] z-40 ring-1 ring-indigo-400') 
                    : ''
            }`}
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'postType', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('postType', id); }}
            onContextMenu={(e) => onContextMenu(e, 'postType', id)}
            onMouseEnter={() => onHover && onHover(id)}
            onMouseLeave={() => onHover && onHover(null)}
        >
            <NodePort type="postType" id={id} portType="target" style={{ top: 22 }} onStartConnection={onStartConnection} onEndConnection={onEndConnection} isLight={isLight} />
            <NodePort type="postType" id={id} portType="source" style={{ top: 22 }} onStartConnection={onStartConnection} onEndConnection={onEndConnection} isLight={isLight} />

            <div className={`px-3 py-2 border-b flex items-center justify-between rounded-t-xl ${
                isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}>
                <div className="flex items-center gap-2">
                    <Table size={14} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} />
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>{data.singularName}</span>
                </div>
                <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{data.slug}</span>
            </div>

            <div className="p-0">
                <div className={`px-3 py-1.5 border-b flex justify-between items-center ${
                    isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-zinc-900/20 border-zinc-800/50'
                }`}>
                    <div className="flex items-center gap-2">
                        <Key size={10} className="text-amber-500" />
                        <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>ID</span>
                    </div>
                    <span className={`text-[9px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>int</span>
                </div>

                <div className="max-h-[300px] overflow-y-auto relative divide-y divide-slate-100 dark:divide-zinc-800/30">
                    {data.metaFields.slice(0, 10).map((mf: any) => {
                        const requiringEndpoints = cptEndpoints.filter((ep: any) => {
                            const mappingEntry = Object.entries(ep.storage?.fieldMapping || {}).find(([paramKey, metaKey]) => metaKey === mf.key);
                            if (!mappingEntry) return false;
                            const paramKey = mappingEntry[0];
                            const param = ep.parameters?.find((p: any) => p.key === paramKey);
                            return param?.required === true;
                        });

                        const isRequiredByAny = requiringEndpoints.length > 0;
                        const isHoveredEpRequiring = requiringEndpoints.some((ep: any) => ep.id === hoveredEndpointId);
                        const isParentChild = mf.key.includes('parent') || mf.targetPostType === data.slug;

                        return (
                            <div 
                                key={mf.id} 
                                className={`px-3 py-1.5 flex justify-between items-center transition-colors ${
                                    isHoveredEpRequiring 
                                        ? (isLight ? 'bg-emerald-100/70 border-l-2 border-emerald-600' : 'bg-emerald-500/10 border-l-2 border-emerald-500') 
                                        : isRequiredByAny 
                                            ? (isLight ? 'bg-amber-50 border-l border-amber-400' : 'bg-amber-500/5 border-l border-amber-500/40') 
                                            : (isLight ? 'hover:bg-slate-50 bg-transparent' : 'hover:bg-zinc-800/40 bg-transparent')
                                }`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden mr-1">
                                    {isParentChild ? (
                                        <Layers size={10} className={isLight ? 'text-amber-600 shrink-0' : 'text-amber-400 shrink-0'} title="Parent-Child Hierarchy Field" />
                                    ) : mf.type === FieldType.RELATIONSHIP ? (
                                        <LinkIcon size={10} className={isLight ? 'text-indigo-600 shrink-0' : 'text-indigo-400 shrink-0'} title="Meta Relationship Field" />
                                    ) : (
                                        <List size={10} className={isLight ? 'text-slate-400 shrink-0' : 'text-zinc-600 shrink-0'} />
                                    )}
                                    <span className={`text-[10px] font-mono truncate ${
                                        isHoveredEpRequiring 
                                            ? (isLight ? 'text-emerald-900 font-bold' : 'text-emerald-300 font-bold') 
                                            : isRequiredByAny 
                                                ? (isLight ? 'text-amber-900 font-medium' : 'text-amber-200 font-medium') 
                                                : isParentChild 
                                                    ? (isLight ? 'text-amber-700 font-semibold' : 'text-amber-300')
                                                    : mf.type === FieldType.RELATIONSHIP 
                                                        ? (isLight ? 'text-indigo-700 font-semibold' : 'text-indigo-300') 
                                                        : (isLight ? 'text-slate-700' : 'text-zinc-300')
                                    }`}>
                                        {mf.key}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {requiringEndpoints.map((ep: any) => (
                                        <span 
                                            key={ep.id} 
                                            className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                ep.id === hoveredEndpointId 
                                                    ? (isLight ? 'bg-emerald-600 text-white animate-pulse' : 'bg-emerald-500 text-black font-extrabold animate-pulse') 
                                                    : (isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30')
                                            }`}
                                        >
                                            {ep.id === hoveredEndpointId ? 'REQ ENDPOINT' : 'REQ'}
                                        </span>
                                    ))}
                                    <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{mf.type}</span>
                                </div>
                            </div>
                        );
                    })}
                    {data.metaFields.length > 10 && (
                        <div className={`px-3 py-1 text-[9px] italic ${isLight ? 'text-slate-400 bg-slate-50' : 'text-zinc-500 bg-zinc-900/20'}`}>
                            + {data.metaFields.length - 10} more fields...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

const TaxonomyNode = React.memo(({ id, data, x, y, onDragStart, onSelect, onContextMenu, isLight }: any) => {
    return (
        <div
            className={`absolute w-[240px] rounded-xl border select-none transition-[border-color,box-shadow,background-color] duration-150 ${
                isLight 
                  ? 'bg-white text-slate-800 border-slate-200/90 shadow-md shadow-slate-200/80 hover:border-pink-400' 
                  : 'bg-[#121214] text-zinc-100 border-zinc-800 shadow-xl hover:border-pink-500/50'
            }`}
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'taxonomy', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('taxonomy', id); }}
            onContextMenu={(e) => onContextMenu(e, 'taxonomy', id)}
        >
            <div className={`px-3 py-2 border-b flex items-center justify-between rounded-t-xl ${
                isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}>
                <div className="flex items-center gap-2">
                    <Tag size={14} className={isLight ? 'text-pink-600' : 'text-pink-400'} />
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>{data.singularName}</span>
                </div>
                <span className={`text-[9px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{data.slug}</span>
            </div>
            <div className="p-2.5">
                <div className="flex flex-wrap gap-1">
                    {data.connectedPostTypes.map((slug: string) => (
                        <span key={slug} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                            isLight ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-pink-500/10 text-pink-300 border-pink-500/20'
                        }`}>
                            {slug}
                        </span>
                    ))}
                    {data.connectedPostTypes.length === 0 && (
                        <span className={`text-[9px] italic ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>Unconnected</span>
                    )}
                </div>
            </div>
        </div>
    );
});

const GlobalHelperNode = React.memo(({ id, data, x, y, onDragStart, onSelect, onContextMenu, isLight }: any) => {
    return (
        <div
            className={`absolute w-[260px] rounded-xl border select-none transition-[border-color,box-shadow,background-color] duration-150 overflow-hidden ${
                isLight 
                  ? 'bg-sky-50/90 text-slate-800 border-sky-200 shadow-md hover:border-sky-400' 
                  : 'bg-[#1a1a2e] text-blue-100 border-blue-900/50 shadow-xl hover:border-blue-400/80'
            }`}
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'helper', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('helper', id); }}
            onContextMenu={(e) => onContextMenu(e, 'helper', id)}
        >
            <div className={`px-3 py-2 border-b flex items-center justify-between ${
                isLight ? 'bg-sky-100/80 border-sky-200' : 'bg-[#16213e]/80 border-blue-900/50'
            }`}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <Braces size={14} className={isLight ? 'text-sky-700 shrink-0' : 'text-blue-400 shrink-0'} />
                    <span className={`text-xs font-bold font-mono truncate ${isLight ? 'text-slate-900' : 'text-blue-100'}`}>{data.name}()</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase border shadow-inner ${
                    isLight ? 'bg-sky-200/80 text-sky-800 border-sky-300' : 'bg-blue-900/30 text-blue-300 border-blue-700/50'
                }`}>Global</span>
            </div>
            <div className="p-2.5 space-y-1.5">
                <div className="flex items-start gap-1">
                    <Code size={10} className={`mt-0.5 shrink-0 ${isLight ? 'text-sky-600' : 'text-blue-300/70'}`} />
                    <span className={`text-[10px] font-mono leading-tight break-all ${isLight ? 'text-slate-700' : 'text-blue-200/80'}`}>
                        ({data.parameters})
                    </span>
                </div>
                {data.description && (
                    <div className={`text-[9px] line-clamp-2 border-l-2 pl-2 ${
                        isLight ? 'text-slate-500 border-sky-300' : 'text-blue-100/50 border-blue-800/50'
                    }`}>
                        {data.description}
                    </div>
                )}
            </div>
        </div>
    );
});

const Minimap = React.memo(({ nodes, viewport, setViewport, containerRef, project, isLight }: any) => {
    const bounds = useMemo(() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const entries = Object.values(nodes);
        if (entries.length === 0) return { x: 0, y: 0, w: 1200, h: 800 };
        entries.forEach((n: any) => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + 280);
            maxY = Math.max(maxY, n.y + 200);
        });
        const padX = 200;
        const padY = 200;
        return { 
          x: minX - padX, 
          y: minY - padY, 
          w: Math.max((maxX - minX) + padX * 2, 800), 
          h: Math.max((maxY - minY) + padY * 2, 600) 
        };
    }, [nodes]);

    const MM_WIDTH = 180;
    const MM_HEIGHT = 110;
    
    const mapX = (x: number) => ((x - bounds.x) / bounds.w) * MM_WIDTH;
    const mapY = (y: number) => ((y - bounds.y) / bounds.h) * MM_HEIGHT;

    const containerW = containerRef?.current?.clientWidth || 1000;
    const containerH = containerRef?.current?.clientHeight || 800;

    const vpW = containerW / viewport.scale;
    const vpH = containerH / viewport.scale;
    const vpX = -viewport.x / viewport.scale;
    const vpY = -viewport.y / viewport.scale;

    const minimapRef = useRef<HTMLDivElement>(null);
    const [isDraggingMinimap, setIsDraggingMinimap] = useState(false);

    const handleMinimapInteraction = useCallback((clientX: number, clientY: number) => {
      if (!minimapRef.current) return;
      const rect = minimapRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(MM_WIDTH, clientX - rect.left));
      const clickY = Math.max(0, Math.min(MM_HEIGHT, clientY - rect.top));

      // Calculate world coordinates from minimap
      const worldX = bounds.x + (clickX / MM_WIDTH) * bounds.w;
      const worldY = bounds.y + (clickY / MM_HEIGHT) * bounds.h;

      // Center the viewport on this world position
      const newVpX = (containerW / 2) - (worldX * viewport.scale);
      const newVpY = (containerH / 2) - (worldY * viewport.scale);

      setViewport((prev: any) => ({ ...prev, x: newVpX, y: newVpY }));
    }, [bounds, containerW, containerH, viewport.scale, setViewport]);

    const onMouseDownMinimap = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDraggingMinimap(true);
      handleMinimapInteraction(e.clientX, e.clientY);
    };

    useEffect(() => {
      if (!isDraggingMinimap) return;

      const onGlobalMouseMove = (e: MouseEvent) => {
        handleMinimapInteraction(e.clientX, e.clientY);
      };

      const onGlobalMouseUp = () => {
        setIsDraggingMinimap(false);
      };

      window.addEventListener('mousemove', onGlobalMouseMove);
      window.addEventListener('mouseup', onGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', onGlobalMouseMove);
        window.removeEventListener('mouseup', onGlobalMouseUp);
      };
    }, [isDraggingMinimap, handleMinimapInteraction]);

    // Color map for node types
    const cptIds = useMemo(() => new Set((project?.postTypes || []).map((p: any) => p.id)), [project?.postTypes]);
    const endpointIds = useMemo(() => new Set((project?.customEndpoints || []).map((e: any) => e.id)), [project?.customEndpoints]);
    const taxIds = useMemo(() => new Set((project?.taxonomies || []).map((t: any) => t.id)), [project?.taxonomies]);

    return (
        <div 
            ref={minimapRef}
            onMouseDown={onMouseDownMinimap}
            className={`absolute bottom-6 right-6 w-[180px] h-[110px] border rounded-xl shadow-2xl overflow-hidden z-50 cursor-crosshair select-none transition-all group backdrop-blur ${
                isLight ? 'bg-white/90 border-slate-300 shadow-slate-300/60' : 'bg-zinc-950/90 border-zinc-700 shadow-black/80'
            }`}
            title="Interactive Minimap: Click or drag to pan canvas"
        >
            <div className={`absolute top-1 left-2 text-[9px] font-bold uppercase tracking-wider pointer-events-none z-10 ${
              isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              Radar
            </div>

            {/* Nodes representation */}
            {Object.entries(nodes).map(([id, pos]: any) => {
                let nodeColor = isLight ? 'bg-slate-400' : 'bg-zinc-600';
                if (cptIds.has(id)) nodeColor = 'bg-blue-500';
                else if (endpointIds.has(id)) nodeColor = 'bg-emerald-500';
                else if (taxIds.has(id)) nodeColor = 'bg-amber-500';
                else nodeColor = 'bg-purple-500';

                return (
                  <div 
                      key={id}
                      className={`absolute rounded-sm ${nodeColor} opacity-75 shadow-xs`}
                      style={{
                          left: Math.max(0, Math.min(MM_WIDTH - 6, mapX(pos.x))),
                          top: Math.max(0, Math.min(MM_HEIGHT - 4, mapY(pos.y))),
                          width: Math.max((280 / bounds.w) * MM_WIDTH, 7),
                          height: Math.max((120 / bounds.h) * MM_HEIGHT, 5),
                      }}
                  />
                );
            })}

            {/* Viewport Box */}
            <div 
                className={`absolute border-2 rounded pointer-events-none transition-transform duration-75 ${
                  isLight 
                    ? 'border-indigo-600 bg-indigo-500/20 shadow-sm shadow-indigo-300' 
                    : 'border-indigo-400 bg-indigo-500/25 shadow-sm shadow-indigo-950'
                }`}
                style={{
                    left: Math.max(-10, Math.min(MM_WIDTH, mapX(vpX))),
                    top: Math.max(-10, Math.min(MM_HEIGHT, mapY(vpY))),
                    width: Math.max(16, (vpW / bounds.w) * MM_WIDTH),
                    height: Math.max(12, (vpH / bounds.h) * MM_HEIGHT),
                }}
            />
        </div>
    );
});


export const FlowDesigner: React.FC<FlowDesignerProps> = ({ 
    project, 
    theme: propsTheme = 'light',
    onToggleTheme,
    onSelect, 
    onDelete, 
    onDuplicate, 
    onAdd, 
    onConnect 
}) => {
  const { postTypes, customEndpoints, taxonomies } = project;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [internalTheme, setInternalTheme] = useState<'light' | 'dark'>(propsTheme);
  const isLight = internalTheme === 'light';

  useEffect(() => {
    setInternalTheme(propsTheme);
  }, [propsTheme]);

  const toggleThemeHandler = () => {
    const next = internalTheme === 'light' ? 'dark' : 'light';
    setInternalTheme(next);
    if (onToggleTheme) onToggleTheme();
  };

  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  const [draggingNode, setDraggingNode] = useState<{ type: ResourceType, id: string, offsetX: number, offsetY: number } | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});
  
  const [connectionDrag, setConnectionDrag] = useState<{
      isActive: boolean;
      sourceType: ResourceType | null;
      sourceId: string | null;
      startX: number;
      startY: number;
      currX: number;
      currY: number;
  }>({
      isActive: false, sourceType: null, sourceId: null, startX: 0, startY: 0, currX: 0, currY: 0
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, type: null, id: null });

  const [hoveredEndpointId, setHoveredEndpointId] = useState<string | null>(null);
  const [hoveredCptId, setHoveredCptId] = useState<string | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // AUTO-LAYOUT
  useEffect(() => {
    setNodePositions(prev => {
        const allKeys = [...postTypes.map(p=>p.id), ...customEndpoints.map(e=>e.id), ...taxonomies.map(t=>t.id), ...(project.globalHelpers || []).map(h=>h.id)];
        if (allKeys.every(k => prev[k])) return prev;

        const next = { ...prev };
        
        const START_X = 420;
        const START_Y = 160;
        const COL_GAP = 420;
        const ROW_GAP = 280;

        // 1. Place CPTs (Core Domain)
        postTypes.forEach((pt, i) => {
            if (!next[pt.id]) {
                next[pt.id] = { x: START_X, y: START_Y + (i * ROW_GAP) };
            }
        });

        // 2. Place Endpoints (Left of CPTs)
        customEndpoints.forEach((ep, i) => {
            if (!next[ep.id]) {
                let y = START_Y + (i * 220);
                let x = START_X - COL_GAP;

                if (ep.storage?.enabled && ep.storage.targetCptSlug) {
                    const targetCpt = postTypes.find(p => p.slug === ep.storage?.targetCptSlug);
                    if (targetCpt && next[targetCpt.id]) {
                        y = next[targetCpt.id].y;
                    }
                }
                next[ep.id] = { x, y };
            }
        });

        // 3. Place Taxonomies (Right of CPTs)
        taxonomies.forEach((tax, i) => {
            if (!next[tax.id]) {
                 let y = START_Y + (i * 160);
                 let x = START_X + COL_GAP;

                 if (tax.connectedPostTypes.length > 0) {
                     const connectedSlug = tax.connectedPostTypes[0];
                     const targetCpt = postTypes.find(p => p.slug === connectedSlug);
                     if (targetCpt && next[targetCpt.id]) {
                         y = next[targetCpt.id].y;
                     }
                 }
                 next[tax.id] = { x, y };
            }
        });

        // 4. Place Global Helpers (Far Left Top)
        (project.globalHelpers || []).forEach((helper, i) => {
            if (!next[helper.id]) {
                next[helper.id] = { x: START_X - (COL_GAP * 1.4), y: START_Y - 120 + (i * 160) };
            }
        });
        
        return next;
    });
  }, [postTypes.length, customEndpoints.length, taxonomies.length, project.globalHelpers?.length]); 

  const screenToCanvas = useCallback((sx: number, sy: number) => {
     const rect = containerRef.current?.getBoundingClientRect();
     if (!rect) return { x: 0, y: 0 };
     return {
         x: (sx - rect.left - viewport.x) / viewport.scale,
         y: (sy - rect.top - viewport.y) / viewport.scale
     };
  }, [viewport]);

  // Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setViewport(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    } else if (draggingNode) {
      const pos = screenToCanvas(e.clientX, e.clientY);
      const GRID_SIZE = snapToGrid ? 20 : 1;
      const targetCanvasX = pos.x - draggingNode.offsetX;
      const targetCanvasY = pos.y - draggingNode.offsetY;
      
      const snappedX = Math.round(targetCanvasX / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(targetCanvasY / GRID_SIZE) * GRID_SIZE;

      setNodePositions(prev => ({
        ...prev,
        [draggingNode.id]: { x: snappedX, y: snappedY }
      }));
    } else if (connectionDrag.isActive) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setConnectionDrag(prev => ({ ...prev, currX: pos.x, currY: pos.y }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNode(null);
    if (connectionDrag.isActive) {
        setConnectionDrag(prev => ({ ...prev, isActive: false }));
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
       e.preventDefault();
       const zoomSensitivity = 0.001;
       const newScale = Math.min(Math.max(0.2, viewport.scale - e.deltaY * zoomSensitivity), 3);
       
       const rect = containerRef.current?.getBoundingClientRect();
       if (rect) {
           const mouseX = e.clientX - rect.left;
           const mouseY = e.clientY - rect.top;
           
           const canvasX = (mouseX - viewport.x) / viewport.scale;
           const canvasY = (mouseY - viewport.y) / viewport.scale;
           
           setViewport({ 
               x: mouseX - canvasX * newScale, 
               y: mouseY - canvasY * newScale, 
               scale: newScale 
           });
       } else {
           setViewport(prev => ({ ...prev, scale: newScale }));
       }
    } else {
        setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleZoom = (delta: number) => {
      const newScale = Math.min(Math.max(0.2, viewport.scale + delta), 3);
      if (newScale === viewport.scale) return;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const canvasX = (centerX - viewport.x) / viewport.scale;
      const canvasY = (centerY - viewport.y) / viewport.scale;
      
      setViewport({ 
          x: centerX - canvasX * newScale, 
          y: centerY - canvasY * newScale, 
          scale: newScale 
      });
  };

  // Node Interactions
  const startDragNode = useCallback((e: React.MouseEvent, type: ResourceType, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    const pos = screenToCanvas(e.clientX, e.clientY);
    let offsetX = 140;
    let offsetY = 20;

    setNodePositions(prev => {
        if (prev[id]) {
            offsetX = pos.x - prev[id].x;
            offsetY = pos.y - prev[id].y;
        }
        setDraggingNode({ type, id, offsetX, offsetY });
        return prev;
    });

  }, [screenToCanvas]);

  const handleStartConnection = useCallback((e: React.MouseEvent, type: ResourceType, id: string, portType: 'source' | 'target') => {
      e.stopPropagation();
      e.preventDefault();
      if (portType === 'target') return;

      const nodePos = nodePositions[id] || {x:0,y:0};
      
      setConnectionDrag({
          isActive: true,
          sourceType: type,
          sourceId: id,
          startX: nodePos.x + 280,
          startY: nodePos.y + 48,
          currX: nodePos.x + 280,
          currY: nodePos.y + 48
      });
  }, [nodePositions]);

  const handleEndConnection = useCallback((e: React.MouseEvent, type: ResourceType, id: string) => {
      e.stopPropagation();
      setConnectionDrag(prev => {
          if (!prev.isActive) return prev;
          if (prev.sourceId === id) return prev;
          
          onConnect(
             { type: prev.sourceType!, id: prev.sourceId! },
             { type, id }
          );
          return { ...prev, isActive: false };
      });
  }, [onConnect]);

  const handleContextMenu = useCallback((e: React.MouseEvent, type: ResourceType, id: string) => {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type, id });
  }, []);

  // Connection Colors Palette
  const colors = useMemo(() => {
    if (isLight) {
        return {
            endpoint: '#059669', // Emerald
            endpointActive: '#10b981',
            relationship: '#4f46e5', // Indigo
            relationshipActive: '#6366f1',
            parentChild: '#d97706', // Amber
            parentChildActive: '#f59e0b',
            taxonomy: '#db2777', // Rose
            taxonomyActive: '#ec4899',
            helper: '#0284c7', // Sky
            helperActive: '#38bdf8'
        };
    }
    return {
        endpoint: '#10b981',
        endpointActive: '#34d399',
        relationship: '#6366f1',
        relationshipActive: '#818cf8',
        parentChild: '#f59e0b',
        parentChildActive: '#fbbf24',
        taxonomy: '#ec4899',
        taxonomyActive: '#f472b6',
        helper: '#06b6d4',
        helperActive: '#22d3ee'
    };
  }, [isLight]);

  // Render Connections with Distinct Colors & Markers
  const connections = useMemo(() => {
    const lines: React.ReactElement[] = [];

    // 1. Endpoint -> CPT Storage Connections (Solid Green)
    customEndpoints.forEach(ep => {
      const startPos = nodePositions[ep.id];
      if (!startPos) return;
      const epRight = { x: startPos.x + 280, y: startPos.y + 48 }; 

      if (ep.storage?.enabled && ep.storage.targetCptSlug) {
        const targetCpt = postTypes.find(pt => pt.slug === ep.storage?.targetCptSlug);
        if (targetCpt && nodePositions[targetCpt.id]) {
           const targetPos = nodePositions[targetCpt.id];
           const targetLeft = { x: targetPos.x, y: targetPos.y + 22 };
           const isActive = ep.id === hoveredEndpointId || targetCpt.id === hoveredCptId;
           const strokeColor = isActive ? colors.endpointActive : colors.endpoint;
           
           lines.push(
             <g key={`link_${ep.id}_${targetCpt.id}`}>
               <path 
                 d={getBezierPath(epRight.x, epRight.y, targetLeft.x, targetLeft.y)}
                 fill="none"
                 stroke={strokeColor} 
                 strokeWidth={isActive ? "3.5" : "2.5"}
                 className={isActive ? "opacity-100" : "opacity-75"}
                 markerEnd="url(#arrow-endpoint)"
               />
               <circle cx={epRight.x} cy={epRight.y} r={isActive ? "4.5" : "3"} fill={strokeColor} />
               <circle cx={targetLeft.x} cy={targetLeft.y} r={isActive ? "4.5" : "3"} fill={strokeColor} />
             </g>
           );
        }
      }
    });

    // 2. CPT Relationships & Parent-Child Hierarchies
    postTypes.forEach(pt => {
        const startPos = nodePositions[pt.id];
        if (!startPos) return;

        pt.metaFields.forEach((field, idx) => {
            if (field.type === FieldType.RELATIONSHIP && field.targetPostType) {
                const targetCpt = postTypes.find(p => p.slug === field.targetPostType);
                if (targetCpt && nodePositions[targetCpt.id]) {
                    const targetPos = nodePositions[targetCpt.id];
                    const fieldY = startPos.y + 60 + (idx * 28) + 14; 
                    const startRight = { x: startPos.x + 280, y: fieldY };
                    
                    // Self reference vs target reference
                    const targetLeft = targetCpt.id === pt.id 
                        ? { x: startPos.x + 280, y: startPos.y + 22 }
                        : { x: targetPos.x, y: targetPos.y + 22 };

                    const isParentChild = field.key.includes('parent') || field.targetPostType === pt.slug;
                    const isCptHovered = pt.id === hoveredCptId || targetCpt.id === hoveredCptId;

                    const strokeColor = isParentChild
                        ? (isCptHovered ? colors.parentChildActive : colors.parentChild)
                        : (isCptHovered ? colors.relationshipActive : colors.relationship);

                    const dashArray = isParentChild ? "8,3,2,3" : "6,4";
                    const markerId = isParentChild ? "url(#arrow-parent)" : "url(#arrow-relationship)";

                    lines.push(
                        <g key={`rel_${pt.id}_${targetCpt.id}_${field.id}`}>
                            <path 
                                d={getBezierPath(startRight.x, startRight.y, targetLeft.x, targetLeft.y)}
                                fill="none"
                                stroke={strokeColor} 
                                strokeWidth={isCptHovered ? "3.5" : "2"}
                                strokeDasharray={dashArray}
                                className={isCptHovered ? "opacity-100" : "opacity-70"}
                                markerEnd={markerId}
                            />
                            <circle cx={startRight.x} cy={startRight.y} r="3" fill={strokeColor} />
                        </g>
                    );
                }
            }
        });
    });

    // 3. Taxonomy Connections (Pink Dotted)
    taxonomies.forEach(tax => {
        const taxPos = nodePositions[tax.id];
        if (!taxPos) return;
        const taxLeft = { x: taxPos.x, y: taxPos.y + 22 };

        tax.connectedPostTypes.forEach(slug => {
            const cpt = postTypes.find(p => p.slug === slug);
            if (cpt && nodePositions[cpt.id]) {
                const cptPos = nodePositions[cpt.id];
                const cptRight = { x: cptPos.x + 280, y: cptPos.y + 22 };
                const isCptHovered = cpt.id === hoveredCptId;
                const strokeColor = isCptHovered ? colors.taxonomyActive : colors.taxonomy;
                
                lines.push(
                     <g key={`tax_${tax.id}_${cpt.id}`}>
                        <path 
                            d={getBezierPath(cptRight.x, cptRight.y, taxLeft.x, taxLeft.y)}
                            fill="none"
                            stroke={strokeColor} 
                            strokeWidth={isCptHovered ? "2.5" : "1.5"}
                            strokeDasharray="3,3"
                            className={isCptHovered ? "opacity-90" : "opacity-50"}
                            markerEnd="url(#arrow-taxonomy)"
                        />
                    </g>
                );
            }
        });
    });

    return lines;
  }, [project, nodePositions, hoveredEndpointId, hoveredCptId, colors]);

  return (
    <div 
      className={`h-full w-full relative overflow-hidden select-none font-sans transition-colors duration-200 ${
          isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#09090b] text-zinc-100'
      }`} 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={() => setContextMenu({ ...contextMenu, visible: false })}
      style={{ cursor: isDraggingCanvas ? 'grabbing' : 'default' }}
    >
      {/* Grid Pattern */}
      <div 
        className={`absolute inset-0 pointer-events-none ${isLight ? 'opacity-30' : 'opacity-[0.08]'}`}
        style={{
           backgroundImage: showGrid 
             ? (isLight 
                 ? 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)' 
                 : 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)')
             : (isLight ? 'radial-gradient(#94a3b8 1px, transparent 0)' : 'radial-gradient(#444 1px, transparent 0)'),
           backgroundSize: `${(showGrid ? 20 : 40) * viewport.scale}px ${(showGrid ? 20 : 40) * viewport.scale}px`,
           backgroundPosition: `${viewport.x}px ${viewport.y}px`
        }}
      />

      {/* Canvas Layer */}
      <div 
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
        }}
      >
         <svg className="absolute inset-0 overflow-visible w-full h-full pointer-events-none z-0" shapeRendering="geometricPrecision">
             <defs>
               <marker id="arrow-endpoint" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                 <path d="M 0 1 L 8 5 L 0 9 z" fill={colors.endpoint} />
               </marker>
               <marker id="arrow-relationship" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                 <path d="M 0 1 L 8 5 L 0 9 z" fill={colors.relationship} />
               </marker>
               <marker id="arrow-parent" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                 <path d="M 0 1 L 8 5 L 0 9 z" fill={colors.parentChild} />
               </marker>
               <marker id="arrow-taxonomy" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                 <path d="M 0 1 L 8 5 L 0 9 z" fill={colors.taxonomy} />
               </marker>
             </defs>

             {/* Canvas Architecture Phase Markers */}
             <g className={isLight ? "opacity-25" : "opacity-10"} transform="translate(-180, 50)">
                <text x="0" y="0" fill={isLight ? "#0284c7" : "#60a5fa"} fontSize="42" fontWeight="bold" fontFamily="monospace" letterSpacing="0.08em">GLOBAL LAYER</text>
                <text x="0" y="26" fill={isLight ? "#334155" : "#94a3b8"} fontSize="14" fontFamily="sans-serif">Shared Logic & Utilities</text>
             </g>

             <g className={isLight ? "opacity-25" : "opacity-10"} transform="translate(0, 50)">
                <text x="0" y="0" fill={isLight ? "#059669" : "#a78bfa"} fontSize="42" fontWeight="bold" fontFamily="monospace" letterSpacing="0.08em">API / DTO LAYER</text>
                <text x="0" y="26" fill={isLight ? "#334155" : "#94a3b8"} fontSize="14" fontFamily="sans-serif">Endpoints, Routing & ETL</text>
             </g>

             <g className={isLight ? "opacity-25" : "opacity-10"} transform="translate(420, 50)">
                <text x="0" y="0" fill={isLight ? "#4f46e5" : "#818cf8"} fontSize="42" fontWeight="bold" fontFamily="monospace" letterSpacing="0.08em">CORE DOMAIN</text>
                <text x="0" y="26" fill={isLight ? "#334155" : "#94a3b8"} fontSize="14" fontFamily="sans-serif">Data Models & Meta Schema</text>
             </g>

             <g className={isLight ? "opacity-25" : "opacity-10"} transform="translate(840, 50)">
                <text x="0" y="0" fill={isLight ? "#db2777" : "#f472b6"} fontSize="42" fontWeight="bold" fontFamily="monospace" letterSpacing="0.08em">CLASSIFICATION</text>
                <text x="0" y="26" fill={isLight ? "#334155" : "#94a3b8"} fontSize="14" fontFamily="sans-serif">Taxonomies & Term Binding</text>
             </g>

             {connections}
             {connectionDrag.isActive && (
                <path 
                    d={getBezierPath(connectionDrag.startX, connectionDrag.startY, connectionDrag.currX, connectionDrag.currY)}
                    fill="none"
                    stroke={isLight ? "#4f46e5" : "#fff"} 
                    strokeWidth="2.5"
                    strokeDasharray="5,5"
                    className="opacity-90"
                />
             )}
          </svg>

          {/* Nodes Layer */}
          <div className="relative z-10">
             {customEndpoints.map(ep => (
                 <EndpointNode 
                     key={ep.id}
                     id={ep.id}
                     data={ep}
                     x={nodePositions[ep.id]?.x || 0}
                     y={nodePositions[ep.id]?.y || 0}
                     onDragStart={startDragNode}
                     onSelect={onSelect}
                     onContextMenu={handleContextMenu}
                     onStartConnection={handleStartConnection}
                     onEndConnection={handleEndConnection}
                     hoveredCptId={hoveredCptId}
                     onHover={setHoveredEndpointId}
                     postTypes={postTypes}
                     isLight={isLight}
                 />
             ))}
             {postTypes.map(pt => (
                 <CPTNode 
                     key={pt.id}
                     id={pt.id}
                     data={pt}
                     x={nodePositions[pt.id]?.x || 0}
                     y={nodePositions[pt.id]?.y || 0}
                     onDragStart={startDragNode}
                     onSelect={onSelect}
                     onContextMenu={handleContextMenu}
                     onStartConnection={handleStartConnection}
                     onEndConnection={handleEndConnection}
                     connectedEndpoints={customEndpoints}
                     hoveredEndpointId={hoveredEndpointId}
                     onHover={setHoveredCptId}
                     customEndpoints={customEndpoints}
                     isLight={isLight}
                 />
             ))}
             {taxonomies.map(tax => (
                 <TaxonomyNode 
                     key={tax.id}
                     id={tax.id}
                     data={tax}
                     x={nodePositions[tax.id]?.x || 0}
                     y={nodePositions[tax.id]?.y || 0}
                     onDragStart={startDragNode}
                     onSelect={onSelect}
                     onContextMenu={handleContextMenu}
                     isLight={isLight}
                 />
             ))}
             {(project.globalHelpers || []).map(helper => (
                 <GlobalHelperNode 
                     key={helper.id}
                     id={helper.id}
                     data={helper}
                     x={nodePositions[helper.id]?.x || 0}
                     y={nodePositions[helper.id]?.y || 0}
                     onDragStart={startDragNode}
                     onSelect={onSelect}
                     onContextMenu={handleContextMenu}
                     isLight={isLight}
                 />
             ))}
          </div>
       </div>

       {/* Overlay Controls */}
       <div className="absolute top-6 left-6 z-50 flex flex-col gap-3">
           <div className={`backdrop-blur border rounded-xl p-1 flex shadow-lg transition-colors ${
               isLight ? 'bg-white/90 border-slate-200' : 'bg-zinc-900/90 border-zinc-800 shadow-2xl'
           }`}>
               <button onClick={() => onAdd('endpoint')} className={`p-2.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'}`} title="New Endpoint">
                 <Network size={18} />
               </button>
               <button onClick={() => onAdd('postType')} className={`p-2.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'}`} title="New Model">
                 <Box size={18} />
               </button>
               <button onClick={() => onAdd('taxonomy')} className={`p-2.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'}`} title="New Taxonomy">
                 <Tag size={18} />
               </button>
               <button onClick={() => onAdd('helper')} className={`p-2.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'}`} title="New Global Function">
                 <Braces size={18} />
               </button>
               <div className={`w-px mx-1 my-2 ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`}></div>
               <button onClick={toggleThemeHandler} className={`p-2.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-amber-600' : 'hover:bg-zinc-800 text-amber-400'}`} title={isLight ? "Switch to Dark Theme" : "Switch to Light Theme"}>
                 {isLight ? <Sun size={18} /> : <Moon size={18} />}
               </button>
               <button onClick={() => setShowLegend(!showLegend)} className={`p-2.5 rounded-lg transition-colors ${showLegend ? (isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/20 text-indigo-400') : (isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300')}`} title="Toggle Relationship Legend">
                 <Layers size={18} />
               </button>
               <button onClick={() => setViewport({x:0,y:0,scale:1})} className={`p-2.5 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-zinc-800 text-zinc-300'}`} title="Reset View">
                 <Maximize size={18} />
               </button>
           </div>

           {/* Connection Legend Panel */}
           {showLegend && (
               <div className={`backdrop-blur border rounded-xl p-3 shadow-lg w-[260px] space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 ${
                   isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-zinc-900/95 border-zinc-800 text-zinc-200 shadow-2xl'
               }`}>
                   <div className="flex items-center justify-between border-b pb-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                       <span>Relationship Colors</span>
                       <HelpCircle size={13} className="text-slate-400" />
                   </div>
                   
                   <div className="space-y-1.5 text-xs">
                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                               <span className="w-3 h-1 rounded-full" style={{ backgroundColor: colors.endpoint }} />
                               <span className="font-medium">Endpoint Storage</span>
                           </div>
                           <span className="text-[10px] text-slate-400 dark:text-zinc-500">Solid</span>
                       </div>

                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                               <span className="w-3 h-1 rounded-full border-t border-dashed" style={{ borderColor: colors.relationship }} />
                               <span className="font-medium">Meta Relationship</span>
                           </div>
                           <span className="text-[10px] text-slate-400 dark:text-zinc-500">Dashed</span>
                       </div>

                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                               <span className="w-3 h-1 rounded-full border-t border-dotted border-2" style={{ borderColor: colors.parentChild }} />
                               <span className="font-medium">Parent-Child Hierarchy</span>
                           </div>
                           <span className="text-[10px] text-slate-400 dark:text-zinc-500">Dot-Dash</span>
                       </div>

                       <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                               <span className="w-3 h-1 rounded-full border-t border-dotted" style={{ borderColor: colors.taxonomy }} />
                               <span className="font-medium">Taxonomy Binding</span>
                           </div>
                           <span className="text-[10px] text-slate-400 dark:text-zinc-500">Fine Dots</span>
                       </div>
                   </div>
               </div>
           )}
       </div>

       {/* Bottom Controls */}
       <div className="absolute bottom-6 left-6 z-50 flex items-center gap-2">
          <div className={`backdrop-blur border rounded-lg p-1 flex items-center shadow-lg ${
              isLight ? 'bg-white/90 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
          }`}>
             <button onClick={() => handleZoom(-0.1)} className={`p-1.5 rounded ${isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-zinc-800 text-zinc-400'}`}><ZoomOut size={16} /></button>
             <span className={`text-xs w-12 text-center font-mono ${isLight ? 'text-slate-600' : 'text-zinc-500'}`}>{Math.round(viewport.scale * 100)}%</span>
             <button onClick={() => handleZoom(0.1)} className={`p-1.5 rounded ${isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-zinc-800 text-zinc-400'}`}><ZoomIn size={16} /></button>
          </div>
          <button 
            onClick={() => setShowGrid(!showGrid)} 
            className={`p-2 rounded-lg border transition-colors ${
                showGrid 
                  ? (isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400') 
                  : (isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500')
            }`}
            title="Toggle Canvas Grid"
          >
             <Grid size={18} />
          </button>
          <button 
            onClick={() => setSnapToGrid(!snapToGrid)} 
            className={`p-2 rounded-lg border text-[10px] font-bold transition-colors ${
                snapToGrid 
                  ? (isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400') 
                  : (isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500')
            }`}
            title="Toggle Snapping"
          >
             SNAP
          </button>
       </div>

       <Minimap 
         nodes={nodePositions} 
         viewport={viewport} 
         setViewport={setViewport} 
         containerRef={containerRef} 
         project={project} 
         isLight={isLight} 
       />

       {/* Context Menu */}
       {contextMenu.visible && (
         <div 
           className={`fixed border rounded-xl shadow-xl py-1 z-[100] min-w-[160px] animate-in fade-in zoom-in-95 duration-100 ${
               isLight ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300' : 'bg-[#18181b] border-zinc-700 text-zinc-300'
           }`}
           style={{ top: contextMenu.y, left: contextMenu.x }}
           onClick={(e) => e.stopPropagation()}
         >
           <button 
             onClick={() => { onSelect(contextMenu.type!, contextMenu.id!); setContextMenu({ ...contextMenu, visible: false }); }}
             className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                 isLight ? 'hover:bg-indigo-50 text-indigo-700' : 'hover:bg-indigo-600 hover:text-white'
             }`}
           >
             <Edit size={14} /> Edit
           </button>
           <button 
              onClick={() => { onDuplicate(contextMenu.type!, contextMenu.id!); setContextMenu({ ...contextMenu, visible: false }); }}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  isLight ? 'hover:bg-indigo-50 text-indigo-700' : 'hover:bg-indigo-600 hover:text-white'
              }`}
           >
             <Copy size={14} /> Duplicate
           </button>
           <div className={`h-px my-1 ${isLight ? 'bg-slate-200' : 'bg-zinc-700'}`}></div>
           <button 
              onClick={() => { onDelete(contextMenu.type!, contextMenu.id!); setContextMenu({ ...contextMenu, visible: false }); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
           >
             <Trash2 size={14} /> Delete
           </button>
         </div>
       )}
    </div>
  );
};
