import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useFirebase } from '../../context/FirebaseContext';

const suggestedPrompts = [
    'What changed in the last meeting?',
    'Which modules depend on auth?',
    'What will break if we remove payment?',
    'Show me all pending conflicts',
    'What is the current project health?',
    'Generate a risk summary',
];

const aiResponses = {
    'Which modules depend on auth?': {
        content: 'The **Authentication Service** is a core dependency for the following modules:',
        structured: {
            type: 'dependency_list',
            title: 'Auth Dependencies (5 modules)',
            items: [
                { label: 'Payment Gateway', value: 'Uses JWT for payment authorization', severity: 'warning' },
                { label: 'User Management', value: 'Delegates session management to Auth', severity: 'info' },
                { label: 'Analytics Engine', value: 'Tracks auth events for user analytics', severity: 'info' },
                { label: 'Notification Service', value: 'Validates user identity before sending', severity: 'success' },
                { label: 'File Storage', value: 'Access control via Auth tokens', severity: 'success' },
            ],
        },
    },
    'Show me all pending conflicts': {
        content: 'I found **2 active conflicts** that require immediate attention:',
        structured: {
            type: 'conflict_list',
            title: 'Active Conflicts',
            items: [
                { label: 'Payment × Billing Schema', value: 'Duplicate invoice_id with conflicting types — Critical', severity: 'critical' },
                { label: 'Auth Dependency Chain', value: 'Single point of failure across 8 modules — High', severity: 'warning' },
            ],
        },
    },
};

const severityColor = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    info: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function StructuredCard({ data }) {
    if (!data) return null;
    return (
        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/8 space-y-2">
            <div className="text-xs font-semibold text-slate-300 mb-3">{data.title}</div>
            {data.items.map((item, i) => (
                <div key={i} className={clsx('flex items-start gap-2 p-2 rounded-lg border text-xs', severityColor[item.severity])}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0" />
                    <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="opacity-75 mt-0.5">{item.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function Message({ msg }) {
    const isAI = msg.role === 'assistant';
    return (
        <div className={clsx('flex gap-3', isAI ? 'items-start' : 'items-start flex-row-reverse')}>
            <div className={clsx(
                'w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0',
                isAI ? 'bg-primary-600/20 border border-primary-500/20' : 'bg-violet-600/20 border border-violet-500/20'
            )}>
                {isAI ? <Bot size={14} className="text-primary-400" /> : <User size={14} className="text-violet-400" />}
            </div>
            <div className={clsx('max-w-[80%]', isAI ? '' : 'items-end flex flex-col')}>
                <div className={clsx(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                    isAI
                        ? 'bg-surface-400 border border-white/6 text-slate-300 rounded-tl-sm'
                        : 'bg-primary-600 text-white rounded-tr-sm'
                )}>
                    {msg.content.split('**').map((part, i) =>
                        i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                    )}
                    {isAI && msg.structured && <StructuredCard data={msg.structured} />}
                </div>
                <div className="text-[10px] text-slate-600 mt-1 px-1">{msg.timestamp}</div>
            </div>
        </div>
    );
}

export default function AIAssistant() {
    const { chatMessages } = useFirebase();
    const [messages, setMessages] = useState(chatMessages || []);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = (text) => {
        if (!text.trim()) return;
        const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        setTimeout(() => {
            const predefined = Object.entries(aiResponses).find(([k]) => text.toLowerCase().includes(k.toLowerCase().split(' ')[0]));
            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                timestamp: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
                ...(predefined
                    ? { content: predefined[1].content, structured: predefined[1].structured }
                    : {
                        content: `I analyzed your query about "${text}". Based on the current project state with 12 modules across 7 meetings, I've identified relevant patterns in the context graph. This feature is tracked to Meeting #6 with 94% confidence. Would you like me to generate a detailed breakdown?`,
                        structured: null,
                    }
                ),
            };
            setMessages(prev => [...prev, aiMsg]);
            setLoading(false);
        }, 1200);
    };

    return (
        <div className="h-full flex flex-col animate-fade-in gap-4">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                    <p className="text-sm text-slate-500">Powered by ProjectIQ Intelligence</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Context Loaded</span>
                </div>
            </div>

            {/* Context badges */}
            <div className="flex flex-wrap gap-2">
                {['12 Modules', '7 Meetings', '5 Risks', 'Full Context'].map(b => (
                    <div key={b} className="badge-info">{b}</div>
                ))}
            </div>

            {/* Suggested prompts */}
            <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-violet-400" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suggested Queries</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map(p => (
                        <button
                            key={p}
                            onClick={() => sendMessage(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/4 border border-white/6 text-xs text-slate-400 hover:text-white hover:bg-white/8 hover:border-white/12 transition-all duration-200"
                        >
                            <ChevronRight size={10} />
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 glass-card p-5 overflow-y-auto space-y-4 min-h-0">
                {messages.map(msg => <Message key={msg.id} msg={msg} />)}

                {/* Loading indicator */}
                {loading && (
                    <div className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-primary-600/20 border border-primary-500/20 flex-shrink-0">
                            <Bot size={14} className="text-primary-400" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-400 border border-white/6">
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="glass-card p-3 flex gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                    placeholder="Ask anything about your project..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
                >
                    <Send size={14} className="text-white" />
                </button>
            </div>
        </div>
    );
}
