import { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { AIBadge, SectionHeader } from '../ui/UIKit';

const nodeConfig = {
    stable: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: '#10b981' },
    conflict: { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400', glow: '#ef4444' },
    updated: { bg: 'bg-primary-500/15', border: 'border-primary-500/30', text: 'text-primary-400', glow: '#6366f1' },
    new: { bg: 'bg-emerald-500/15', border: 'border-emerald-400/30', text: 'text-emerald-300', glow: '#34d399' },
};

const edgeConfig = {
    stable: '#10b981',
    conflict: '#ef4444',
    pending: '#f59e0b',
};

const typeConfig = {
    core: { ring: 'ring-2 ring-primary-500/30', size: 'w-20 h-20' },
    service: { ring: '', size: 'w-16 h-16' },
    gateway: { ring: 'ring-2 ring-amber-500/30', size: 'w-18 h-18' },
};

// SVG-based graph with drag support
const CANVAS_W = 680;
const CANVAS_H = 380;
const NODE_W = 90;

function InteractiveGraph({ nodes, edges, selectedNode, setSelectedNode }) {
    const [pan, setPan] = useState({ x: 30, y: 30 });
    const [zoom, setZoom] = useState(1);
    const [dragging, setDragging] = useState(null);
    const [nodePositions, setNodePositions] = useState(() =>
        Object.fromEntries(nodes.map(n => [n.id, { x: n.x * 1.3 + 20, y: n.y * 1.3 + 20 }]))
    );
    const svgRef = useRef(null);
    const dragStart = useRef(null);

    const handleNodeMouseDown = useCallback((e, id) => {
        e.preventDefault();
        const svgRect = svgRef.current.getBoundingClientRect();
        dragStart.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: nodePositions[id].x,
            nodeY: nodePositions[id].y,
        };
        setDragging(id);
    }, [nodePositions]);

    const handleMouseMove = useCallback((e) => {
        if (!dragging || !dragStart.current) return;
        const dx = (e.clientX - dragStart.current.mouseX) / zoom;
        const dy = (e.clientY - dragStart.current.mouseY) / zoom;
        setNodePositions(prev => ({
            ...prev,
            [dragging]: {
                x: dragStart.current.nodeX + dx,
                y: dragStart.current.nodeY + dy,
            },
        }));
    }, [dragging, zoom]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
        dragStart.current = null;
    }, []);

    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="cursor-grab active:cursor-grabbing select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <defs>
                {Object.entries(edgeConfig).map(([key, color]) => (
                    <marker key={key} id={`arrow-${key}`} viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={color + 'aa'} />
                    </marker>
                ))}
                {nodes.map(n => (
                    <filter key={n.id} id={`glow-${n.id}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                ))}
            </defs>

            <g transform={`scale(${zoom})`}>
                {/* Edges */}
                {edges.map((edge, i) => {
                    const from = nodePositions[edge.from];
                    const to = nodePositions[edge.to];
                    if (!from || !to) return null;
                    const color = edgeConfig[edge.status];
                    const midX = (from.x + to.x) / 2;
                    const midY = (from.y + to.y) / 2;
                    return (
                        <g key={i}>
                            <line
                                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke={color + '40'} strokeWidth="12"
                                strokeLinecap="round"
                            />
                            <line
                                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke={color} strokeWidth={edge.status === 'conflict' ? 2 : 1.5}
                                strokeDasharray={edge.status === 'pending' ? '5,3' : ''}
                                strokeOpacity={0.7}
                                markerEnd={`url(#arrow-${edge.status})`}
                            />
                        </g>
                    );
                })}

                {/* Nodes */}
                {nodes.map(n => {
                    const pos = nodePositions[n.id];
                    const conf = nodeConfig[n.status];
                    const isSelected = selectedNode?.id === n.id;
                    return (
                        <g
                            key={n.id}
                            transform={`translate(${pos.x}, ${pos.y})`}
                            onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                            onClick={() => setSelectedNode(isSelected ? null : n)}
                            className="cursor-pointer"
                        >
                            {/* Glow ring */}
                            {isSelected && (
                                <circle r="32" fill="none" stroke={conf.glow} strokeWidth="2" strokeOpacity="0.5"
                                    style={{ filter: `drop-shadow(0 0 8px ${conf.glow})` }} />
                            )}
                            {/* Pulse for conflict */}
                            {n.status === 'conflict' && (
                                <circle r="28" fill={conf.glow + '10'} stroke={conf.glow} strokeWidth="1" strokeOpacity="0.4">
                                    <animate attributeName="r" values="26;34;26" dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
                                </circle>
                            )}
                            {/* Node background */}
                            <circle r="24" fill={conf.glow + '18'} stroke={conf.glow} strokeWidth={isSelected ? 2 : 1} strokeOpacity={0.6} />
                            {/* Type indicator */}
                            {n.type === 'core' && (
                                <circle r="5" cx="18" cy="-18" fill="#6366f1" />
                            )}
                            {n.type === 'gateway' && (
                                <circle r="5" cx="18" cy="-18" fill="#f59e0b" />
                            )}
                            {/* Label */}
                            <text
                                textAnchor="middle"
                                dy="45"
                                fontSize="10"
                                fontFamily="Inter, sans-serif"
                                fontWeight="500"
                                fill="rgba(255,255,255,0.7)"
                            >
                                {n.label.split(' ').map((word, wi) => (
                                    <tspan key={wi} x="0" dy={wi === 0 ? 0 : 14}>{word}</tspan>
                                ))}
                            </text>
                            {/* Status dot */}
                            <circle r="5" cx="18" cy="-18" fill={conf.glow} opacity="0.9"
                                style={{ filter: `drop-shadow(0 0 4px ${conf.glow})` }} />
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}

export default function IntegrationGraph() {
    const { graphNodes, graphEdges } = useFirebase();
    const [selectedNode, setSelectedNode] = useState(null);
    const [zoom, setZoom] = useState(1);

    const nodeDetail = selectedNode ? graphNodes.find(n => n.id === selectedNode.id) : null;
    const nodeEdges = selectedNode ? graphEdges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id) : [];

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader
                title="Integration Map"
                subtitle="Visual system architecture with dependency graph"
                badge="AI Generated"
            />

            {/* Legend */}
            <div className="flex flex-wrap gap-4">
                {[
                    { color: '#10b981', label: 'Stable Connection' },
                    { color: '#ef4444', label: 'Conflict' },
                    { color: '#f59e0b', label: 'Pending Update', dashed: true },
                ].map(({ color, label, dashed }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-slate-400">
                        <svg width="24" height="8">
                            <line x1="0" y1="4" x2="24" y2="4" stroke={color} strokeWidth="2"
                                strokeDasharray={dashed ? '4,2' : ''} />
                        </svg>
                        {label}
                    </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded-full bg-primary-500" />
                    Core Service
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    Gateway
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Graph canvas */}
                <div className="lg:col-span-2 glass-card p-4 relative">
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
                        <button
                            onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
                            className="w-7 h-7 glass-card flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <ZoomIn size={13} />
                        </button>
                        <button
                            onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
                            className="w-7 h-7 glass-card flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <ZoomOut size={13} />
                        </button>
                        <button
                            onClick={() => setZoom(1)}
                            className="w-7 h-7 glass-card flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <Maximize2 size={13} />
                        </button>
                    </div>
                    <div className="h-96 w-full">
                        <InteractiveGraph
                            nodes={graphNodes}
                            edges={graphEdges}
                            selectedNode={selectedNode}
                            setSelectedNode={setSelectedNode}
                            zoom={zoom}
                        />
                    </div>
                    <div className="mt-2 text-center text-xs text-slate-600">Click nodes to inspect · Drag to reposition</div>
                </div>

                {/* Node detail */}
                <div className="glass-card p-5 flex flex-col gap-4">
                    {nodeDetail ? (
                        <div className="animate-fade-in">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="font-semibold text-white">{nodeDetail.label}</div>
                                    <div className="text-xs text-slate-500 capitalize mt-0.5">{nodeDetail.type}</div>
                                </div>
                                <span className={clsx(
                                    'text-xs font-medium px-2 py-0.5 rounded-full capitalize',
                                    nodeConfig[nodeDetail.status].bg,
                                    nodeConfig[nodeDetail.status].text,
                                    'border',
                                    nodeDetail.status === 'conflict' ? 'border-red-500/20' : 'border-white/10'
                                )}>{nodeDetail.status}</span>
                            </div>

                            <div className="label mb-2">Connections</div>
                            <div className="space-y-2">
                                {nodeEdges.map((e, i) => {
                                    const isSrc = e.from === nodeDetail.id;
                                    const otherId = isSrc ? e.to : e.from;
                                    const other = graphNodes.find(n => n.id === otherId);
                                    return (
                                        <div key={i} className={clsx(
                                            'flex items-center gap-2 p-2 rounded-lg text-xs border',
                                            e.status === 'conflict' ? 'bg-red-500/8 border-red-500/20' :
                                                e.status === 'pending' ? 'bg-amber-500/8 border-amber-500/20' :
                                                    'bg-white/3 border-white/5'
                                        )}>
                                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: edgeConfig[e.status] }} />
                                            <span className="text-slate-400">{isSrc ? '→' : '←'}</span>
                                            <span className="text-slate-300">{other?.label}</span>
                                            <span className={clsx(
                                                'ml-auto capitalize font-medium',
                                                e.status === 'conflict' ? 'text-red-400' : e.status === 'pending' ? 'text-amber-400' : 'text-emerald-400'
                                            )}>{e.status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-slate-600">
                            <Info size={32} strokeWidth={1.5} />
                            <div>
                                <div className="text-sm font-medium text-slate-500">Click a node</div>
                                <div className="text-xs mt-1">to inspect its connections and status</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
