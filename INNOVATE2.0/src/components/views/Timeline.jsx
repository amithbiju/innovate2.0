import { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronRight, X, ExternalLink } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { StatusBadge, AIBadge, SectionHeader } from '../ui/UIKit';

const typeConfig = {
    new: { color: 'bg-emerald-500', light: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'New Module', emoji: '✨' },
    update: { color: 'bg-primary-500', light: 'bg-primary-500/15', text: 'text-primary-400', label: 'Update', emoji: '🔁' },
    conflict: { color: 'bg-red-500', light: 'bg-red-500/15', text: 'text-red-400', label: 'Conflict', emoji: '⚠️' },
    pivot: { color: 'bg-amber-500', light: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pivot', emoji: '🔄' },
};

function TimelineDetailPanel({ event, onClose }) {
    return (
        <div className="glass-card animate-fade-in overflow-hidden">
            <div className="flex items-start justify-between p-5 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{typeConfig[event.type].emoji}</span>
                        <span className="font-semibold text-white">{event.meeting} — {event.title}</span>
                    </div>
                    <div className="text-xs text-slate-500">{event.date}</div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="p-5 space-y-5">
                <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                    <p className="text-sm text-slate-300">{event.summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <div className="label mb-3">Extracted Requirements</div>
                        <div className="space-y-2">
                            {event.requirements.map((r, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                                    {r}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="label mb-3">AI Actions Taken</div>
                        <div className="space-y-2">
                            {event.changes.map((c, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                    <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', c.startsWith('⚠️') ? 'bg-red-500' : 'bg-emerald-500')} />
                                    {c}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="label mb-3">Impacted Modules</div>
                        <div className="space-y-1.5">
                            {event.impactedModules.map((m, i) => (
                                <div key={i} className="badge-info inline-flex mr-1.5 mb-1 cursor-pointer hover:bg-primary-500/25 transition-colors">{m}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Timeline() {
    const { timelineEvents } = useFirebase();
    const [selectedEvent, setSelectedEvent] = useState(null);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader
                title="Evolution Timeline"
                subtitle="Chronological view of all meetings and project changes"
                badge="AI Tracked"
            />

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(typeConfig).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className={clsx('w-2.5 h-2.5 rounded-full', val.color)} />
                        {val.label}
                    </div>
                ))}
            </div>

            {/* Timeline */}
            <div className="glass-card p-6">
                {/* Horizontal scroll container */}
                <div className="overflow-x-auto pb-4">
                    <div className="flex items-start gap-0 min-w-max">
                        {timelineEvents.map((event, idx) => {
                            const conf = typeConfig[event.type];
                            const isSelected = selectedEvent?.id === event.id;

                            return (
                                <div key={event.id} className="flex items-start">
                                    {/* Event node */}
                                    <div
                                        className="flex flex-col items-center cursor-pointer group"
                                        onClick={() => setSelectedEvent(isSelected ? null : event)}
                                    >
                                        {/* Node */}
                                        <div className={clsx(
                                            'w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 border-2',
                                            isSelected
                                                ? `${conf.light} border-current ${conf.text} shadow-lg scale-110`
                                                : `${conf.light} border-transparent group-hover:scale-105`
                                        )}>
                                            {conf.emoji}
                                        </div>

                                        {/* Connector line */}
                                        <div className={clsx('w-0.5 h-4 mt-1', conf.color, 'opacity-40')} />

                                        {/* Info card */}
                                        <div
                                            className={clsx(
                                                'w-44 p-3 rounded-xl border transition-all duration-300',
                                                isSelected
                                                    ? 'bg-surface-400 border-white/15 shadow-glass'
                                                    : 'bg-white/3 border-white/5 group-hover:bg-white/5 group-hover:border-white/10'
                                            )}
                                        >
                                            <div className={clsx('text-[10px] font-bold uppercase tracking-wider mb-1', conf.text)}>{event.meeting}</div>
                                            <div className="text-xs font-semibold text-white mb-1 leading-tight">{event.title}</div>
                                            <div className="text-[10px] text-slate-600">{event.date}</div>
                                            <div className={clsx('mt-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block', conf.light, conf.text)}>
                                                {conf.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Connector between events */}
                                    {idx < timelineEvents.length - 1 && (
                                        <div className="flex items-start pt-6 px-1">
                                            <div className="flex items-center gap-0">
                                                <div className="w-6 h-0.5 bg-white/8" />
                                                <ChevronRight size={10} className="text-slate-700" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Detail Panel */}
            {selectedEvent && (
                <TimelineDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            )}
        </div>
    );
}
