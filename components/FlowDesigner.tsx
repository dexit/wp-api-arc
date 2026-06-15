import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ProjectState, ResourceType, ContextMenuState, FieldType } from '../types';
import { Network, Database, Box, Edit, Trash2, Copy, Move, Link as LinkIcon, Key, Table, List, ZoomIn, ZoomOut, Grid, Maximize, Tag, Code, Braces, Workflow } from 'lucide-react';

interface FlowDesignerProps {
  project: ProjectState;
  onSelect: (type: ResourceType, id: string) => void;
  onDelete: (type: ResourceType, id: string) => void;
  onDuplicate: (type: ResourceType, id: string) => void;
  onAdd: (type: ResourceType) => void;
  onConnect: (source: { type: ResourceType, id: string }, target: { type: ResourceType, id: string }) => void;
}

const getBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = Math.abs(x2 - x1);
  const curvature = Math.max(dx * 0.5, 80);
  return `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;
};

// --- Sub Components ---

const NodePort = React.memo(({ type, id, portType, style, onStartConnection, onEndConnection }: any) => (
  <div 
    className={`absolute w-3 h-3 rounded-full border border-zinc-900 flex items-center justify-center cursor-crosshair hover:scale-150 transition-transform z-50 ${portType === 'source' ? 'bg-zinc-400 hover:bg-white -right-1.5' : 'bg-zinc-600 hover:bg-white -left-1.5'}`}
    style={style}
    onMouseDown={(e) => onStartConnection(e, type, id, portType)}
    onMouseUp={(e) => onEndConnection(e, type, id)}
  />
));

const EndpointNode = React.memo(({ id, data, x, y, onDragStart, onSelect, onContextMenu, onStartConnection, onEndConnection }: any) => {
    const hasDTO = data.parameters && data.parameters.length > 0;
    const hasStorage = data.storage?.enabled;
    const hasLogic = data.customPhp && data.customPhp.trim().length > 0;
    const isETL = hasStorage && hasLogic;

    return (
        <div
            className="absolute w-[280px] bg-[#121214] rounded-lg shadow-2xl border border-zinc-800 group hover:border-pink-500/50 transition-colors duration-200 select-none"
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'endpoint', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('endpoint', id); }}
            onContextMenu={(e) => onContextMenu(e, 'endpoint', id)}
        >
            <NodePort type="endpoint" id={id} portType="source" style={{ top: 52 }} onStartConnection={onStartConnection} onEndConnection={onEndConnection} />
            
            <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between rounded-t-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            data.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 
                            data.method === 'POST' ? 'bg-green-500/20 text-green-400' : 
                            'bg-orange-500/20 text-orange-400'
                        }`}>
                            {data.method}
                    </span>
                    <span className="text-xs font-bold text-zinc-200 font-mono truncate" title={data.route}>{data.route}</span>
                </div>
                <Network size={12} className="text-pink-500 shrink-0" />
            </div>

            <div className="p-2 space-y-1">
                {hasDTO && (
                    <div className="mb-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-sm w-fit">
                        <span className="text-[8px] font-bold text-yellow-500/80 uppercase tracking-widest">DTO SCHEMA</span>
                    </div>
                )}
                {!hasDTO && <div className="pl-1 text-[10px] text-zinc-700 italic">No params</div>}
                
                {data.parameters.slice(0,4).map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center px-2 py-1 bg-zinc-900/30 rounded border border-transparent hover:border-zinc-800">
                        <span className="text-[10px] text-pink-300 font-mono">{p.key}</span>
                        <span className="text-[9px] text-zinc-600">{p.type}</span>
                    </div>
                ))}
                
                {(hasStorage || hasLogic) && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/50 space-y-1.5">
                        {isETL && (
                             <div className="flex items-center gap-2 text-[9px] text-purple-400 bg-purple-900/10 p-1.5 rounded border border-purple-900/20">
                                <Workflow size={10} className="shrink-0" />
                                <span className="font-bold tracking-wide">ETL PIPELINE</span>
                             </div>
                        )}
                        {hasStorage && !isETL && (
                            <div className="flex items-center gap-2 text-[9px] text-green-400 bg-green-900/10 p-1.5 rounded border border-green-900/20">
                                <Database size={10} className="shrink-0" />
                                Writes to: <span className="font-bold">{data.storage.targetCptSlug}</span>
                            </div>
                        )}
                        {hasLogic && !isETL && (
                            <div className="flex items-center gap-2 text-[9px] text-indigo-400 bg-indigo-900/10 p-1.5 rounded border border-indigo-900/20">
                                <Code size={10} className="shrink-0" />
                                <span className="font-bold tracking-wide">CUSTOM LOGIC</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

const CPTNode = React.memo(({ id, data, x, y, onDragStart, onSelect, onContextMenu, onStartConnection, onEndConnection }: any) => {
    return (
        <div
            className="absolute w-[280px] bg-[#121214] rounded-lg shadow-2xl border border-zinc-800 group hover:border-indigo-500/50 transition-colors duration-200 select-none"
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'postType', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('postType', id); }}
            onContextMenu={(e) => onContextMenu(e, 'postType', id)}
        >
            <NodePort type="postType" id={id} portType="target" style={{ top: 24 }} onStartConnection={onStartConnection} onEndConnection={onEndConnection} />
            <NodePort type="postType" id={id} portType="source" style={{ top: 24 }} onStartConnection={onStartConnection} onEndConnection={onEndConnection} />

            <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between rounded-t-lg">
                <div className="flex items-center gap-2">
                        <Table size={12} className="text-indigo-500" />
                        <span className="text-xs font-bold text-zinc-100">{data.singularName}</span>
                </div>
                <span className="text-[9px] text-zinc-600 font-mono">{data.slug}</span>
            </div>

            <div className="p-0">
                    <div className="px-3 py-1.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/20">
                        <div className="flex items-center gap-2">
                            <Key size={10} className="text-yellow-600" />
                            <span className="text-[10px] text-zinc-500 font-mono">ID</span>
                        </div>
                        <span className="text-[9px] text-zinc-700">int</span>
                    </div>

                    <div className="max-h-[200px] overflow-hidden relative">
                        {data.metaFields.slice(0, 6).map((mf: any) => (
                            <div key={mf.id} className="px-3 py-1.5 border-b border-zinc-800/30 flex justify-between items-center hover:bg-zinc-800/30 transition-colors">
                                <div className="flex items-center gap-2">
                                    {mf.type === FieldType.RELATIONSHIP ? <LinkIcon size={10} className="text-indigo-500"/> : <List size={10} className="text-zinc-700"/>}
                                    <span className={`text-[10px] font-mono ${mf.type === FieldType.RELATIONSHIP ? 'text-indigo-300' : 'text-zinc-400'}`}>{mf.key}</span>
                                </div>
                                <span className="text-[9px] text-zinc-600">{mf.type}</span>
                            </div>
                        ))}
                        {data.metaFields.length > 6 && (
                            <div className="px-3 py-1 text-[9px] text-zinc-600 bg-zinc-900/20 italic">
                                + {data.metaFields.length - 6} more fields...
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
});

const TaxonomyNode = React.memo(({ id, data, x, y, onDragStart, onSelect, onContextMenu }: any) => {
    return (
        <div
            className="absolute w-[240px] bg-[#121214] rounded-lg shadow-xl border border-zinc-800 group hover:border-pink-500/50 transition-colors duration-200 select-none"
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'taxonomy', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('taxonomy', id); }}
            onContextMenu={(e) => onContextMenu(e, 'taxonomy', id)}
        >
            <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between rounded-t-lg">
                <div className="flex items-center gap-2">
                        <Tag size={12} className="text-pink-500" />
                        <span className="text-xs font-bold text-zinc-100">{data.singularName}</span>
                </div>
                <span className="text-[9px] text-zinc-600 font-mono">{data.slug}</span>
            </div>
            <div className="p-2">
                <div className="flex flex-wrap gap-1">
                    {data.connectedPostTypes.map((slug: string) => (
                        <span key={slug} className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20">
                            {slug}
                        </span>
                    ))}
                    {data.connectedPostTypes.length === 0 && <span className="text-[9px] text-zinc-600 italic">Unconnected</span>}
                </div>
            </div>
        </div>
    );
});

const GlobalHelperNode = React.memo(({ id, data, x, y, onDragStart, onSelect, onContextMenu, onStartConnection, onEndConnection }: any) => {
    return (
        <div
            className="absolute w-[260px] bg-[#1a1a2e] rounded-lg shadow-xl border border-blue-900/50 group hover:border-blue-400/80 transition-colors duration-200 select-none overflow-hidden"
            style={{ left: x, top: y }}
            onMouseDown={(e) => onDragStart(e, 'helper', id)}
            onDoubleClick={(e) => { e.stopPropagation(); onSelect('helper', id); }}
            onContextMenu={(e) => onContextMenu(e, 'helper', id)}
        >
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-blue-500/5 rounded-lg pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

            <div className="px-3 py-2 bg-[#16213e]/80 border-b border-blue-900/50 flex items-center justify-between z-10 relative">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Braces size={14} className="text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-blue-100 font-mono truncate">{data.name}()</span>
                </div>
                <span className="text-[9px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded font-bold tracking-wider uppercase border border-blue-700/50 shadow-inner block">Global</span>
            </div>
            <div className="p-2 z-10 relative space-y-2">
                <div className="flex items-start gap-1">
                    <Code size={10} className="text-blue-300/70 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-blue-200/80 font-mono leading-tight break-all">
                        ({data.parameters})
                    </span>
                </div>
                {data.description && (
                    <div className="text-[9px] text-blue-100/50 line-clamp-2 mt-1 px-1 border-l-2 border-blue-800/50 pl-2">
                        {data.description}
                    </div>
                )}
            </div>
        </div>
    );
});

const Minimap = React.memo(({ nodes, viewport }: any) => {
    const bounds = useMemo(() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        if (Object.keys(nodes).length === 0) return { x: 0, y: 0, w: 100, h: 100 };
        Object.values(nodes).forEach((n: any) => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + 280);
            maxY = Math.max(maxY, n.y + 200);
        });
        return { x: minX - 100, y: minY - 100, w: (maxX - minX) + 200, h: (maxY - minY) + 200 };
    }, [nodes]);

    const MM_WIDTH = 160;
    const MM_HEIGHT = 100;
    
    const mapX = (x: number) => ((x - bounds.x) / bounds.w) * MM_WIDTH;
    const mapY = (y: number) => ((y - bounds.y) / bounds.h) * MM_HEIGHT;

    const vpW = 1000 / viewport.scale;
    const vpH = 800 / viewport.scale;
    const vpX = -viewport.x / viewport.scale;
    const vpY = -viewport.y / viewport.scale;

    return (
        <div className="absolute bottom-6 right-6 w-[160px] h-[100px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden opacity-80 hover:opacity-100 transition-opacity z-50 pointer-events-none">
            {Object.entries(nodes).map(([id, pos]: any) => (
                <div 
                    key={id}
                    className="absolute bg-zinc-600 rounded-sm"
                    style={{
                        left: mapX(pos.x),
                        top: mapY(pos.y),
                        width: (280 / bounds.w) * MM_WIDTH,
                        height: (100 / bounds.h) * MM_HEIGHT,
                    }}
                />
            ))}
            <div 
                className="absolute border border-indigo-500 bg-indigo-500/10"
                style={{
                    left: mapX(vpX),
                    top: mapY(vpY),
                    width: (vpW / bounds.w) * MM_WIDTH,
                    height: (vpH / bounds.h) * MM_HEIGHT,
                }}
            />
        </div>
    );
});


export const FlowDesigner: React.FC<FlowDesignerProps> = ({ project, onSelect, onDelete, onDuplicate, onAdd, onConnect }) => {
  const { postTypes, customEndpoints, taxonomies } = project;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

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

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // SMART AUTO-LAYOUT
  useEffect(() => {
    setNodePositions(prev => {
        // If positions already exist for all nodes, don't re-layout constantly
        const allKeys = [...postTypes.map(p=>p.id), ...customEndpoints.map(e=>e.id), ...taxonomies.map(t=>t.id), ...(project.globalHelpers || []).map(h=>h.id)];
        if (allKeys.every(k => prev[k])) return prev;

        const next = { ...prev };
        
        // Constants for grid
        const START_X = 400;
        const START_Y = 150;
        const COL_GAP = 400;
        const ROW_GAP = 280;

        // 1. Place CPTs (Backbone)
        postTypes.forEach((pt, i) => {
            if (!next[pt.id]) {
                next[pt.id] = { x: START_X, y: START_Y + (i * ROW_GAP) };
            }
        });

        // 2. Place Endpoints (Left of CPTs)
        customEndpoints.forEach((ep, i) => {
            if (!next[ep.id]) {
                let y = START_Y + (i * 200); // Default stack
                let x = START_X - COL_GAP;

                // Smart: Align with Target CPT
                if (ep.storage?.enabled && ep.storage.targetCptSlug) {
                    const targetCpt = postTypes.find(p => p.slug === ep.storage?.targetCptSlug);
                    if (targetCpt && next[targetCpt.id]) {
                        y = next[targetCpt.id].y;
                        // Avoid direct overlap if multiple endpoints target same CPT
                        // Simple jitter
                        y += (Math.random() * 60 - 30);
                    }
                }
                next[ep.id] = { x, y };
            }
        });

        // 3. Place Taxonomies (Right of CPTs)
        taxonomies.forEach((tax, i) => {
            if (!next[tax.id]) {
                 let y = START_Y + (i * 150);
                 let x = START_X + COL_GAP;

                 // Smart: Align with connected CPT (first found)
                 if (tax.connectedPostTypes.length > 0) {
                     const connectedSlug = tax.connectedPostTypes[0];
                     const targetCpt = postTypes.find(p => p.slug === connectedSlug);
                     if (targetCpt && next[targetCpt.id]) {
                         y = next[targetCpt.id].y;
                         y += (Math.random() * 60 - 30);
                     }
                 }
                 next[tax.id] = { x, y };
            }
        });

        // 4. Place Global Helpers (Top Left or scattered)
        (project.globalHelpers || []).forEach((helper, i) => {
            if (!next[helper.id]) {
                next[helper.id] = { x: START_X - (COL_GAP * 1.5), y: START_Y - 100 + (i * 150) };
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
    const pos = screenToCanvas(e.clientX, e.clientY);
    setMousePos({ x: Math.round(pos.x), y: Math.round(pos.y) });
    
    if (isDraggingCanvas) {
      setViewport(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    } else if (draggingNode) {
      // Precision Snap
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
       
       // Zoom to current mouse position
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
    
    // Default fallback to center of typical node size
    let offsetX = 140;
    let offsetY = 20;

    // To cleanly access current position without making nodePositions a massive dependency:
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
          startX: nodePos.x + 280, // Approximate right side
          startY: nodePos.y + 50,
          currX: nodePos.x + 280,
          currY: nodePos.y + 50
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

  // Render Connections
  const connections = useMemo(() => {
    const lines: React.ReactElement[] = [];

    // Endpoint -> Storage
    customEndpoints.forEach(ep => {
      const startPos = nodePositions[ep.id];
      if (!startPos) return;
      const epRight = { x: startPos.x + 280, y: startPos.y + 58 }; 

      if (ep.storage?.enabled && ep.storage.targetCptSlug) {
        const targetCpt = postTypes.find(pt => pt.slug === ep.storage?.targetCptSlug);
        if (targetCpt && nodePositions[targetCpt.id]) {
           const targetPos = nodePositions[targetCpt.id];
           const targetLeft = { x: targetPos.x, y: targetPos.y + 30 };
           
           lines.push(
             <g key={`link_${ep.id}_${targetCpt.id}`}>
               <path 
                 d={getBezierPath(epRight.x, epRight.y, targetLeft.x, targetLeft.y)}
                 fill="none"
                 stroke="#10b981" 
                 strokeWidth="2"
                 className="opacity-60"
               />
               <circle cx={epRight.x} cy={epRight.y} r="2" fill="#10b981" />
               <circle cx={targetLeft.x} cy={targetLeft.y} r="2" fill="#10b981" />
             </g>
           );
        }
      }
    });

    // CPT Relationships
    postTypes.forEach(pt => {
        const startPos = nodePositions[pt.id];
        if (!startPos) return;

        pt.metaFields.forEach((field, idx) => {
            if (field.type === FieldType.RELATIONSHIP && field.targetPostType) {
                const targetCpt = postTypes.find(p => p.slug === field.targetPostType);
                if (targetCpt && nodePositions[targetCpt.id] && targetCpt.id !== pt.id) {
                    const targetPos = nodePositions[targetCpt.id];
                    const fieldY = startPos.y + 76 + (idx * 29) + 14; 
                    const startRight = { x: startPos.x + 280, y: fieldY };
                    const targetLeft = { x: targetPos.x, y: targetPos.y + 30 };

                    lines.push(
                        <g key={`rel_${pt.id}_${targetCpt.id}_${field.id}`}>
                            <path 
                                d={getBezierPath(startRight.x, startRight.y, targetLeft.x, targetLeft.y)}
                                fill="none"
                                stroke="#6366f1" 
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                className="opacity-50"
                            />
                            <circle cx={startRight.x} cy={startRight.y} r="2" fill="#6366f1" />
                        </g>
                    );
                }
            }
        });
    });

    // Taxonomy Connections (Visual only)
    taxonomies.forEach(tax => {
        const taxPos = nodePositions[tax.id];
        if (!taxPos) return;
        const taxLeft = { x: taxPos.x, y: taxPos.y + 30 };

        tax.connectedPostTypes.forEach(slug => {
            const cpt = postTypes.find(p => p.slug === slug);
            if (cpt && nodePositions[cpt.id]) {
                const cptPos = nodePositions[cpt.id];
                const cptRight = { x: cptPos.x + 280, y: cptPos.y + 30 };
                
                lines.push(
                     <g key={`tax_${tax.id}_${cpt.id}`}>
                        <path 
                            d={getBezierPath(cptRight.x, cptRight.y, taxLeft.x, taxLeft.y)}
                            fill="none"
                            stroke="#ec4899" 
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            className="opacity-30"
                        />
                    </g>
                );
            }
        });
    });

    return lines;
  }, [project, nodePositions]);

  return (
    <div 
      className="h-full w-full bg-[#09090b] relative overflow-hidden select-none font-sans" 
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
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
           backgroundImage: showGrid 
             ? 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)'
             : 'radial-gradient(#444 1px, transparent 0)',
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
         <svg className="absolute inset-0 overflow-visible w-full h-full pointer-events-none z-0">
             {/* Architecture Phase Labels */}
             <g className="opacity-10" transform="translate(-200, 50)">
                <text x="0" y="0" fill="#60a5fa" fontSize="48" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">GLOBAL LAYER</text>
                <text x="0" y="30" fill="#60a5fa" fontSize="16" fontFamily="sans-serif">Shared Logic & Utilities</text>
             </g>

             <g className="opacity-10" transform="translate(0, 50)">
                <text x="0" y="0" fill="#a78bfa" fontSize="48" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">API / DTO LAYER</text>
                <text x="0" y="30" fill="#a78bfa" fontSize="16" fontFamily="sans-serif">Endpoints, Routing & ETL</text>
             </g>

             <g className="opacity-10" transform="translate(400, 50)">
                <text x="0" y="0" fill="#818cf8" fontSize="48" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">CORE DOMAIN</text>
                <text x="0" y="30" fill="#818cf8" fontSize="16" fontFamily="sans-serif">Data Models & Schema</text>
             </g>

             <g className="opacity-10" transform="translate(800, 50)">
                <text x="0" y="0" fill="#f472b6" fontSize="48" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">CLASSIFICATION</text>
                <text x="0" y="30" fill="#f472b6" fontSize="16" fontFamily="sans-serif">Taxonomies & Grouping</text>
             </g>

             {connections}
             {connectionDrag.isActive && (
                <path 
                    d={getBezierPath(connectionDrag.startX, connectionDrag.startY, connectionDrag.currX, connectionDrag.currY)}
                    fill="none"
                    stroke="#fff" 
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    className="opacity-80"
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
                />
            ))}
         </div>
      </div>

      {/* Overlay UI Controls */}
      <div className="absolute top-6 left-6 z-50 flex flex-col gap-4">
          <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-xl p-1 flex shadow-2xl">
              <button onClick={() => onAdd('endpoint')} className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="New Endpoint">
                <Network size={20} />
              </button>
              <button onClick={() => onAdd('postType')} className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="New Model">
                <Box size={20} />
              </button>
              <button onClick={() => onAdd('taxonomy')} className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="New Taxonomy">
                <Tag size={20} />
              </button>
              <button onClick={() => onAdd('helper')} className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="New Global Function">
                <Braces size={20} />
              </button>
              <div className="w-px bg-zinc-800 mx-1 my-2"></div>
              <button onClick={() => setViewport({x:0,y:0,scale:1})} className="p-2.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Reset View">
                <Maximize size={20} />
              </button>
          </div>
      </div>

      <div className="absolute bottom-6 left-6 z-50 flex items-center gap-2">
         <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg p-1 flex items-center">
            <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-zinc-800 rounded text-zinc-400"><ZoomOut size={16} /></button>
            <span className="text-xs text-zinc-500 w-12 text-center font-mono">{Math.round(viewport.scale * 100)}%</span>
            <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-zinc-800 rounded text-zinc-400"><ZoomIn size={16} /></button>
         </div>
         <button 
           onClick={() => setShowGrid(!showGrid)} 
           className={`p-2 rounded-lg border ${showGrid ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
         >
            <Grid size={18} />
         </button>
         <button 
           onClick={() => setSnapToGrid(!snapToGrid)} 
           className={`p-2 rounded-lg border text-[10px] font-bold ${snapToGrid ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
           title="Toggle Snapping"
         >
            SNAP
         </button>
         <div className="bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] text-zinc-500 font-mono">
            X: {mousePos.x} Y: {mousePos.y}
         </div>
      </div>

      <Minimap nodes={nodePositions} viewport={viewport} />

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="fixed bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl py-1 z-[100] min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => { onSelect(contextMenu.type!, contextMenu.id!); setContextMenu({ ...contextMenu, visible: false }); }}
            className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
          >
            <Edit size={14} /> Edit
          </button>
          <button 
             onClick={() => { onDuplicate(contextMenu.type!, contextMenu.id!); setContextMenu({ ...contextMenu, visible: false }); }}
             className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
          >
            <Copy size={14} /> Duplicate
          </button>
          <div className="h-px bg-zinc-700 my-1"></div>
          <button 
             onClick={() => { onDelete(contextMenu.type!, contextMenu.id!); setContextMenu({ ...contextMenu, visible: false }); }}
             className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};
