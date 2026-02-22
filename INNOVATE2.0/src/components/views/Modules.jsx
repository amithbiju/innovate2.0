import { useState } from 'react';
import { ChevronDown, ChevronRight, GitBranch, Cpu, Code, Link, ArrowRight, Search, Filter } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { StatusBadge, HealthRing, AIBadge, SectionHeader, ProgressBar } from '../ui/UIKit';
import { clsx } from 'clsx';

const versionColors = {
    updated: 'text-primary-400',
    conflict: 'text-red-400',
    new: 'text-emerald-400',
    stable: 'text-slate-400',
};

function ModuleCard({ mod }) {
    const [expanded, setExpanded] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState(mod.version);

    return (
        <div className={clsx(
            'glass-card transition-all duration-300 overflow-hidden',
            expanded && 'border-primary-500/20',
            mod.status === 'conflict' && 'border-red-500/20'
        )}>
            {/* Card Header */}
            <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-white/2 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Icon */}
                <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    mod.status === 'conflict' ? 'bg-red-500/15' :
                        mod.status === 'new' ? 'bg-emerald-500/15' :
                            mod.status === 'updated' ? 'bg-primary-500/15' :
                                'bg-white/5'
                )}>
                    <Cpu size={18} className={
                        mod.status === 'conflict' ? 'text-red-400' :
                            mod.status === 'new' ? 'text-emerald-400' :
                                mod.status === 'updated' ? 'text-primary-400' :
                                    'text-slate-400'
                    } />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">{mod.name}</span>
                        <StatusBadge status={mod.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className={versionColors[mod.status]}>{selectedVersion}</span>
                        <span>·</span>
                        <span>{mod.team}</span>
                        <span>·</span>
                        <span>Updated {mod.lastUpdated}</span>
                    </div>
                </div>

                {/* Health */}
                <div className="hidden sm:flex items-center gap-4">
                    <div className="text-center">
                        <div className={clsx(
                            'text-lg font-bold',
                            mod.health >= 80 ? 'text-emerald-400' : mod.health >= 60 ? 'text-amber-400' : 'text-red-400'
                        )}>{mod.health}%</div>
                        <div className="text-[10px] text-slate-600">Health</div>
                    </div>

                    {/* Feature count */}
                    <div className="text-center hidden md:block">
                        <div className="text-lg font-bold text-white">{mod.features.length}</div>
                        <div className="text-[10px] text-slate-600">Features</div>
                    </div>

                    {/* API count */}
                    <div className="text-center hidden lg:block">
                        <div className="text-lg font-bold text-white">{mod.apis.length}</div>
                        <div className="text-[10px] text-slate-600">APIs</div>
                    </div>
                </div>

                {/* Expand icon */}
                <div className="ml-2 text-slate-500">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-white/5 animate-fade-in">
                    {/* Version selector */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-white/2 border-b border-white/5">
                        <span className="text-xs text-slate-500">Version:</span>
                        <div className="flex gap-1.5">
                            {mod.changeHistory.map((h, i) => {
                                const ver = h.split(' - ')[0];
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedVersion(ver)}
                                        className={clsx(
                                            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                                            selectedVersion === ver
                                                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/8'
                                        )}
                                    >
                                        {ver}
                                    </button>
                                );
                            })}
                        </div>
                        <button className="ml-auto text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                            View Changes <ArrowRight size={12} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/5">
                        {/* Features */}
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Code size={14} className="text-primary-400" />
                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Features</span>
                            </div>
                            <div className="space-y-2">
                                {mod.features.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 flex-shrink-0" />
                                        {f}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dependencies + APIs */}
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Link size={14} className="text-amber-400" />
                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Dependencies</span>
                            </div>
                            <div className="space-y-1.5 mb-5">
                                {mod.dependencies.map((d, i) => (
                                    <span key={i} className="badge-warning inline-flex mr-1.5 mb-1">{d}</span>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <Code size={14} className="text-primary-400" />
                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">API Endpoints</span>
                            </div>
                            <div className="space-y-1.5">
                                {mod.apis.map((api, i) => (
                                    <div key={i} className="font-mono text-xs text-slate-500 bg-white/3 px-2.5 py-1 rounded-lg border border-white/5">
                                        {api}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Change History */}
                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <GitBranch size={14} className="text-violet-400" />
                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Change Log</span>
                            </div>
                            <div className="space-y-3">
                                {mod.changeHistory.map((h, i) => {
                                    const [ver, ...rest] = h.split(' - ');
                                    return (
                                        <div key={i} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={clsx('w-2 h-2 rounded-full mt-1 flex-shrink-0', i === 0 ? 'bg-primary-500' : 'bg-white/10')} />
                                                {i < mod.changeHistory.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                                            </div>
                                            <div className="pb-3">
                                                <span className={clsx('text-xs font-semibold', i === 0 ? 'text-primary-400' : 'text-slate-500')}>{ver}</span>
                                                <p className="text-xs text-slate-600 mt-0.5">{rest.join(' - ')}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Modules() {
    const { modules } = useFirebase();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const filtered = modules.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || m.status === filter;
        return matchSearch && matchFilter;
    });

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader
                title="Module Explorer"
                subtitle={`${modules.length} modules across the project architecture`}
                badge="AI Managed"
            />

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/4 border border-white/6 flex-1 max-w-xs">
                    <Search size={14} className="text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search modules..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent text-sm text-white placeholder-slate-600 outline-none w-full"
                    />
                </div>
                <div className="flex gap-1.5">
                    {['all', 'stable', 'updated', 'new', 'conflict'].map(f => (
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
                            {f}
                        </button>
                    ))}
                </div>
                <div className="ml-auto text-xs text-slate-500">{filtered.length} modules</div>
            </div>

            {/* Module list */}
            <div className="space-y-3">
                {filtered.map(mod => <ModuleCard key={mod.id} mod={mod} />)}
            </div>
        </div>
    );
}
