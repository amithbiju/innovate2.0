import { useState } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Layers, AlertTriangle, GitMerge, Activity, ArrowUpRight, Cpu } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { HealthRing, StatusBadge, AIBadge, SectionHeader, ProgressBar, Tooltip as UITooltip } from '../ui/UIKit';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="glass-card p-3 text-xs">
                <p className="text-slate-400 mb-2 font-semibold">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-slate-400">{p.name}:</span>
                        <span className="text-white font-medium">{p.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const KPICard = ({ icon: Icon, label, value, sub, color, trend }) => (
    <div className="kpi-card group">
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} className="text-white" />
            </div>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <ArrowUpRight size={12} className={trend < 0 ? 'rotate-180' : ''} />
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm font-medium text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
);

const ActivityItem = ({ item }) => {
    const colorMap = {
        info: 'bg-primary-500/15 text-primary-400',
        warning: 'bg-amber-500/15 text-amber-400',
        success: 'bg-emerald-500/15 text-emerald-400',
        ai: 'bg-violet-500/15 text-violet-400',
    };
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors group cursor-pointer">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${colorMap[item.severity]}`}>
                {item.icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">{item.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">{item.desc}</div>
            </div>
            <span className="text-[10px] text-slate-600 flex-shrink-0 mt-0.5">{item.time}</span>
        </div>
    );
};

export default function Overview() {
    const { kpiData, progressData, activityFeed } = useFirebase();
    const [chartType, setChartType] = useState('modules');

    return (
        <div className="space-y-6 animate-fade-in">
            <SectionHeader
                title="Project Intelligence Overview"
                subtitle="AI-generated insights and live project state"
                badge="AI Analyzed"
            />

            {/* KPI Row */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard icon={Cpu} label="Health Score" value={`${kpiData.healthScore}%`} sub="AI-generated" color="bg-primary-600/20" trend={4} />
                <KPICard icon={Layers} label="Modules" value={kpiData.modules} sub="2 new this week" color="bg-emerald-600/20" trend={20} />
                <KPICard icon={Activity} label="Active Updates" value={kpiData.activeUpdates} sub="Since last meeting" color="bg-amber-600/20" trend={-10} />
                <KPICard icon={AlertTriangle} label="Conflicts" value={kpiData.pendingConflicts} sub="Needs attention" color="bg-red-600/20" trend={50} />
            </div>

            {/* Health + Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Health Card */}
                <div className="glass-card p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-white">Project Health</div>
                            <div className="text-xs text-slate-500 mt-0.5">AI-generated score</div>
                        </div>
                        <AIBadge label="AI Score" />
                    </div>
                    <div className="flex items-center gap-6">
                        <UITooltip tip="Overall project health based on modules, conflicts, and progress">
                            <HealthRing score={kpiData.healthScore} size={88} />
                        </UITooltip>
                        <div className="space-y-3 flex-1">
                            {[
                                { label: 'Module Coverage', val: 87 },
                                { label: 'Test Coverage', val: 72 },
                                { label: 'Integration', val: 65 },
                                { label: 'Documentation', val: 58 },
                            ].map(({ label, val }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="text-slate-400">{val}%</span>
                                    </div>
                                    <ProgressBar value={val} color={val >= 70 ? 'bg-primary-500' : val >= 50 ? 'bg-amber-500' : 'bg-red-500'} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Progress */}
                    <div className="mt-2 p-3 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex justify-between text-xs mb-2">
                            <span className="text-slate-500">Timeline Progress</span>
                            <span className="text-emerald-400 font-semibold">68%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary-600 to-emerald-500 rounded-full" style={{ width: '68%' }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 mt-1.5">
                            <span>Jan 5, 2026</span>
                            <span>Q2 2026</span>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="glass-card p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="text-sm font-semibold text-white">Evolution Progress</div>
                            <div className="text-xs text-slate-500">Module growth over 8 weeks</div>
                        </div>
                        <div className="flex gap-1">
                            {['modules', 'features', 'coverage'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setChartType(t)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${chartType === t ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={progressData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey={chartType} stroke="#6366f1" strokeWidth={2} fill="url(#colorPrimary)" dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5, fill: '#818cf8' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-white">Live Activity Feed</div>
                    <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors">View all</button>
                </div>
                <div className="space-y-1">
                    {activityFeed.map(item => <ActivityItem key={item.id} item={item} />)}
                </div>
            </div>
        </div>
    );
}
