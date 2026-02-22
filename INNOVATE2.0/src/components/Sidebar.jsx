import { useState } from 'react';
import { clsx } from 'clsx';
import {
    LayoutDashboard, Layers, GitBranch, Network, AlertTriangle,
    Bot, Settings, FolderOpen, ChevronLeft, ChevronRight,
    Zap, TrendingUp
} from 'lucide-react';

const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { id: 'modules', icon: Layers, label: 'Modules', badge: '12' },
    { id: 'timeline', icon: GitBranch, label: 'Evolution Timeline', badge: null },
    { id: 'graph', icon: Network, label: 'Integration Map', badge: null },
    { id: 'risks', icon: AlertTriangle, label: 'Risks & Insights', badge: '3' },
    { id: 'traceability', icon: TrendingUp, label: 'Traceability', badge: null },
    { id: 'assistant', icon: Bot, label: 'AI Assistant', badge: null },
];

const bottomItems = [
    { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ activeView, setActiveView }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={clsx(
                'relative flex flex-col h-full glass-panel border-r border-white/5 transition-all duration-300 ease-in-out flex-shrink-0',
                collapsed ? 'w-16' : 'w-60'
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-glow-sm">
                    <Zap size={16} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <div className="text-sm font-bold text-white whitespace-nowrap">ProjectIQ</div>
                        <div className="text-[10px] text-slate-500 whitespace-nowrap">AI Intelligence</div>
                    </div>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                {!collapsed && (
                    <div className="px-3 py-2">
                        <span className="label">Navigation</span>
                    </div>
                )}
                {navItems.map(({ id, icon: Icon, label, badge }) => (
                    <button
                        key={id}
                        onClick={() => setActiveView(id)}
                        className={clsx(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                            activeView === id
                                ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        )}
                    >
                        <Icon size={18} className="flex-shrink-0" />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left whitespace-nowrap">{label}</span>
                                {badge && (
                                    <span className={clsx(
                                        'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                                        activeView === id ? 'bg-primary-500/30 text-primary-300' : 'bg-white/10 text-slate-400'
                                    )}>
                                        {badge}
                                    </span>
                                )}
                            </>
                        )}
                        {collapsed && badge && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                    </button>
                ))}
            </nav>

            {/* Bottom Items */}
            <div className="p-2 border-t border-white/5 space-y-0.5">
                {bottomItems.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveView(id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                        <Icon size={18} className="flex-shrink-0" />
                        {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                    </button>
                ))}

                {/* User avatar */}
                <div className={clsx('flex items-center gap-3 px-3 py-2.5 mt-1', collapsed && 'justify-center')}>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        SC
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <div className="text-xs font-medium text-white whitespace-nowrap">Sarah Chen</div>
                            <div className="text-[10px] text-slate-500 whitespace-nowrap">CTO</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-400 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200 z-10 hover:border-white/20"
            >
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
        </aside>
    );
}
