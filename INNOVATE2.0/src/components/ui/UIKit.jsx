import { clsx } from 'clsx';

// Status badge component
export const StatusBadge = ({ status }) => {
    const config = {
        updated: { cls: 'badge-info', label: 'Updated' },
        new: { cls: 'badge-success', label: 'New' },
        conflict: { cls: 'badge-danger', label: 'Conflict' },
        stable: { cls: 'bg-white/5 text-slate-400 border border-white/10 text-xs font-medium px-2.5 py-0.5 rounded-full', label: 'Stable' },
        critical: { cls: 'badge-danger', label: 'Critical' },
        high: { cls: 'badge-warning', label: 'High' },
        medium: { cls: 'badge-info', label: 'Medium' },
        low: { cls: 'bg-white/5 text-slate-400 border border-white/10 text-xs font-medium px-2.5 py-0.5 rounded-full', label: 'Low' },
    };
    const c = config[status] || config.stable;
    return <span className={c.cls}>{c.label}</span>;
};

// AI Badge
export const AIBadge = ({ label = 'AI Insight' }) => (
    <span className="badge-ai flex items-center gap-1">
        <span className="text-violet-400">✦</span> {label}
    </span>
);

// Health Score Ring
export const HealthRing = ({ score, size = 80 }) => {
    const radius = size / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth="6"
                    strokeDasharray={`${progress} ${circumference}`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-lg font-bold text-white">{score}</span>
            </div>
        </div>
    );
};

// Loading skeleton
export const Skeleton = ({ className }) => (
    <div className={clsx('bg-white/5 rounded-lg animate-pulse', className)} />
);

// Section Header
export const SectionHeader = ({ title, subtitle, badge, actions }) => (
    <div className="flex items-start justify-between mb-6">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <h2 className="section-title">{title}</h2>
                {badge && <AIBadge label={badge} />}
            </div>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
);

// Tooltip wrapper
export const Tooltip = ({ children, tip }) => (
    <div className="relative group">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-surface-300 border border-white/10 rounded-lg text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {tip}
        </div>
    </div>
);

// Mini progress bar
export const ProgressBar = ({ value, color = 'bg-primary-500' }) => (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-700', color)} style={{ width: `${value}%` }} />
    </div>
);

// Icon button
export const IconBtn = ({ icon: Icon, onClick, className, tip }) => (
    <Tooltip tip={tip}>
        <button
            onClick={onClick}
            className={clsx('p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-200', className)}
        >
            <Icon size={16} />
        </button>
    </Tooltip>
);
