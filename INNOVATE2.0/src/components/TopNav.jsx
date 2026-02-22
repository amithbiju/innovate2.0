import { useState } from 'react';
import { Search, Bell, ChevronDown, Command, Sun, Moon, Plus } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import NewProjectDialog from './dialogs/NewProjectDialog';

export default function TopNav({ currentProject, setCurrentProject, darkMode, setDarkMode }) {
    const { projects } = useFirebase();
    const [projectOpen, setProjectOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [showNewProject, setShowNewProject] = useState(false);

    return (
        <header className="h-14 flex items-center gap-4 px-6 border-b border-white/5 glass-panel flex-shrink-0">
            {/* Project selector */}
            <div className="relative">
                <button
                    onClick={() => setProjectOpen(!projectOpen)}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/12 transition-all duration-200 text-sm"
                >
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-500 to-violet-600 flex-shrink-0" />
                    <span className="font-medium text-white max-w-[140px] truncate">{currentProject.name}</span>
                    <div className={`w-2 h-2 rounded-full ml-1 flex-shrink-0 ${currentProject.health >= 80 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${projectOpen ? 'rotate-180' : ''}`} />
                </button>

                {projectOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 glass-card p-1 z-50 animate-fade-in">
                        <div className="px-3 py-1.5">
                            <span className="label">Projects</span>
                        </div>
                        {projects?.map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setCurrentProject(p); setProjectOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${p.id === currentProject.id ? 'bg-primary-600/15 text-primary-400' : 'text-slate-300 hover:bg-white/5'
                                    }`}
                            >
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-violet-600" />
                                <span className="flex-1 text-left">{p.name}</span>
                                <span className={`text-xs font-semibold ${p.health >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{p.health}%</span>
                            </button>
                        ))}
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                onClick={() => { setProjectOpen(false); setShowNewProject(true); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200"
                            >
                                <Plus size={14} className="text-slate-400" />
                                <span>New Project</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Search bar */}
            <div className={`flex-1 max-w-lg relative transition-all duration-300 ${searchFocused ? 'max-w-2xl' : ''}`}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${searchFocused ? 'bg-surface-400 border-primary-500/40 shadow-glow-sm' : 'bg-white/4 border-white/6 hover:border-white/10'
                    }`}>
                    <Search size={14} className={`flex-shrink-0 transition-colors ${searchFocused ? 'text-primary-400' : 'text-slate-500'}`} />
                    <input
                        type="text"
                        placeholder="Search modules, features, meetings..."
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none min-w-0"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/8">
                            <Command size={10} className="text-slate-500" />
                            <span className="text-[10px] text-slate-500">K</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
                {/* Dark mode toggle */}
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-xl bg-white/4 border border-white/6 hover:border-white/12 text-slate-400 hover:text-white transition-all duration-200"
                >
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                {/* Notifications */}
                <button className="relative p-2 rounded-xl bg-white/4 border border-white/6 hover:border-white/12 text-slate-400 hover:text-white transition-all duration-200">
                    <Bell size={15} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-surface-900" />
                </button>

                {/* Profile */}
                <div className="flex items-center gap-2.5 pl-2 border-l border-white/8">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                        SC
                    </div>
                    <div className="hidden sm:block">
                        <div className="text-xs font-medium text-white">Sarah Chen</div>
                        <div className="text-[10px] text-slate-500">CTO</div>
                    </div>
                    <ChevronDown size={12} className="text-slate-500" />
                </div>
            </div>

            {showNewProject && (
                <NewProjectDialog
                    onClose={() => setShowNewProject(false)}
                    onProjectCreated={(newProject) => {
                        // The UI will auto-update via Firebase listener, but we can auto-select the new one
                        setCurrentProject(newProject);
                    }}
                />
            )}
        </header>
    );
}
