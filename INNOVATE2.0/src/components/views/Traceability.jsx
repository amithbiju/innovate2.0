import { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, ExternalLink, Search, MessageSquare } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { AIBadge, SectionHeader } from '../ui/UIKit';

function TraceCard({ item }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="glass-card overflow-hidden transition-all duration-300">
            <div
                className="flex items-start gap-4 p-5 cursor-pointer hover:bg-white/2 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Confidence indicator */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                        style={{
                            background: `conic-gradient(#6366f1 ${item.confidence * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                        }}
                    >
                        <div className="w-8 h-8 rounded-lg bg-surface-600 flex items-center justify-center text-[11px] font-bold text-primary-400">
                            {item.confidence}%
                        </div>
                    </div>
                    <div className="text-[9px] text-slate-600 text-center">AI Conf.</div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">{item.feature}</span>
                        <AIBadge label="Traced" />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="text-primary-400 font-medium">{item.module}</span>
                        <span>·</span>
                        <span>{item.version}</span>
                        <span>·</span>
                        <span className="text-amber-400">{item.meeting}</span>
                        <span>·</span>
                        <span>{item.date}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/15 text-primary-400 border border-primary-500/20 text-xs font-medium hover:bg-primary-600/25 transition-colors"
                    >
                        <ExternalLink size={11} />
                        View Source
                    </button>
                    {expanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                </div>
            </div>

            {/* Expanded context */}
            {expanded && (
                <div className="border-t border-white/5 p-5 animate-fade-in space-y-4">
                    {/* Quote */}
                    <div className="flex gap-3 p-4 rounded-xl bg-white/3 border-l-2 border-primary-500/50">
                        <MessageSquare size={15} className="text-primary-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs text-slate-500 mb-1.5">{item.speaker} — {item.date} @ {item.timestamp}</div>
                            <p className="text-sm text-slate-300 italic">{item.context}</p>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Source Meeting', value: item.meeting },
                            { label: 'Timestamp', value: item.timestamp },
                            { label: 'Speaker', value: item.speaker.split(' (')[0] },
                            { label: 'Confidence', value: `${item.confidence}%` },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-3 rounded-xl bg-white/3 border border-white/5">
                                <div className="text-[10px] text-slate-600 mb-1 uppercase tracking-wider">{label}</div>
                                <div className="text-xs font-medium text-slate-300">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Traceability() {
    const { traceability } = useFirebase();
    const [search, setSearch] = useState('');
    const filtered = traceability.filter(t =>
        t.feature.toLowerCase().includes(search.toLowerCase()) ||
        t.module.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader
                title="Feature Traceability"
                subtitle="Every feature traced back to its origin meeting and speaker"
                badge="AI Traced"
            />

            {/* Info banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-500/8 border border-primary-500/20">
                <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🔍</span>
                </div>
                <div className="text-sm text-slate-300">
                    <span className="font-semibold text-primary-400">Full traceability</span> — Every feature can be traced to the exact meeting timestamp and speaker who requested it.
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/6 max-w-md">
                <Search size={14} className="text-slate-500" />
                <input
                    type="text"
                    placeholder="Search features or modules..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-transparent text-sm text-white placeholder-slate-600 outline-none flex-1"
                />
            </div>

            {/* Cards */}
            <div className="space-y-3">
                {filtered.map(item => <TraceCard key={item.id} item={item} />)}
            </div>
        </div>
    );
}
