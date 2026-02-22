import { useState } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, AlertOctagon, Info, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { AIBadge, SectionHeader } from '../ui/UIKit';

const severityConfig = {
    critical: {
        icon: AlertOctagon,
        bg: 'bg-red-500/10',
        border: 'border-red-500/25',
        text: 'text-red-400',
        badge: 'bg-red-500/15 text-red-400 border-red-500/25',
        bar: 'bg-red-500',
        label: 'Critical',
    },
    high: {
        icon: AlertTriangle,
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/25',
        text: 'text-amber-400',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
        bar: 'bg-amber-500',
        label: 'High',
    },
    medium: {
        icon: Info,
        bg: 'bg-primary-500/10',
        border: 'border-primary-500/25',
        text: 'text-primary-400',
        badge: 'bg-primary-500/15 text-primary-400 border-primary-500/25',
        bar: 'bg-primary-500',
        label: 'Medium',
    },
    low: {
        icon: Info,
        bg: 'bg-white/4',
        border: 'border-white/8',
        text: 'text-slate-400',
        badge: 'bg-white/5 text-slate-400 border-white/10',
        bar: 'bg-slate-500',
        label: 'Low',
    },
};

function RiskCard({ risk }) {
    const [expanded, setExpanded] = useState(false);
    const conf = severityConfig[risk.severity];
    const Icon = conf.icon;

    return (
        <div className={clsx('rounded-2xl border transition-all duration-300', conf.bg, conf.border)}>
            <div
                className="flex items-start gap-4 p-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Severity icon */}
                <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', conf.bg)}>
                    <Icon size={17} className={conf.text} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-white">{risk.title}</span>
                        {risk.ai && <AIBadge label="AI Detected" />}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{risk.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {risk.affected.map((m, i) => (
                            <span key={i} className={clsx('text-xs font-medium px-2 py-0.5 rounded-full border', conf.badge)}>{m}</span>
                        ))}
                    </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full border', conf.badge)}>
                        {conf.label}
                    </span>
                    <span className="text-[10px] text-slate-600">{risk.source}</span>
                    {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 animate-fade-in">
                    <div className="border-t border-white/5 pt-4">
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
                            <Zap size={14} className="text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-semibold text-white mb-1">Suggested Action</div>
                                <p className="text-xs text-slate-400">{risk.action}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Risks() {
    const { risks } = useFirebase();
    const [filter, setFilter] = useState('all');

    const counts = { all: risks.length, critical: 0, high: 0, medium: 0, low: 0 };
    risks.forEach(r => counts[r.severity]++);

    const filtered = filter === 'all' ? risks : risks.filter(r => r.severity === filter);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader
                title="Risks & Insights"
                subtitle="AI-detected risks, conflicts, and scope issues"
                badge="AI Analysed"
            />

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { key: 'critical', label: 'Critical', color: 'bg-red-500', glow: 'shadow-red-500/20' },
                    { key: 'high', label: 'High', color: 'bg-amber-500', glow: 'shadow-amber-500/20' },
                    { key: 'medium', label: 'Medium', color: 'bg-primary-500', glow: 'shadow-primary-500/20' },
                    { key: 'low', label: 'Low', color: 'bg-slate-500', glow: '' },
                ].map(({ key, label, color, glow }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(filter === key ? 'all' : key)}
                        className={clsx(
                            'glass-card p-4 text-left transition-all duration-200 hover:border-white/10',
                            filter === key && 'border-white/15'
                        )}
                    >
                        <div className={clsx('w-2 h-2 rounded-full mb-3 shadow-lg', color, glow)} />
                        <div className="text-2xl font-bold text-white">{counts[key]}</div>
                        <div className="text-xs text-slate-500 mt-1">{label} Priority</div>
                    </button>
                ))}
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
                {['all', 'critical', 'high', 'medium', 'low'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={clsx(
                            'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                            filter === f
                                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                                : 'bg-white/4 text-slate-400 border border-white/6 hover:text-white'
                        )}
                    >
                        {f} {f !== 'all' && `(${counts[f]})`}
                    </button>
                ))}
            </div>

            {/* Risk list */}
            <div className="space-y-3">
                {filtered.map(risk => <RiskCard key={risk.id} risk={risk} />)}
            </div>
        </div>
    );
}
