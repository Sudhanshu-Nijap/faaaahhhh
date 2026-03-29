import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Trash2, Pause, Play, Globe, ExternalLink, 
  Send, Bot, User, Activity, Zap, Plus, Filter, Loader2, ChevronDown, Check,
  Target, Shield
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';
import AddJobModal from './AddJobModal';

// ── Shared System Message Component ─────────────────────────────────────────────
const SystemBubble = ({ content, icon: Icon = Activity }) => (
  <div className="flex justify-center my-4">
    <div className="px-4 py-1.5 bg-white/[0.03] border border-white/5 rounded-full flex items-center gap-3">
      <Icon size={10} className="text-secondary animate-pulse" />
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{content}</span>
    </div>
  </div>
);

const SchedulingDashboard = ({ setAlert, confirm }) => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const messagesEndRef = useRef(null);
    const [filter, setFilter] = useState({ url: '', type: 'all', status: 'all' });

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            const { data } = await axios.get(`http://localhost:5005/api/scheduling/jobs?userId=${userId}`);
            setJobs(data);
        } catch (err) {
            setAlert({ type: 'error', message: 'Failed to sync scheduling substrate.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const socket = io('http://localhost:5005');
        socket.on('job-sync', (update) => {
            setJobs(prevJobs => prevJobs.map(job => 
                job._id === update.jobId 
                    ? { ...job, status: update.status, isActive: update.isActive ?? job.isActive, lastRun: update.lastRun ?? job.lastRun } 
                    : job
            ));
        });
        return () => {
            socket.off('job-sync');
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [jobs, loading, isTyping]);

    const handleToggleActive = async (job) => {
        try {
            const { data } = await axios.patch(`http://localhost:5005/api/scheduling/job/${job._id}`, {
                isActive: !job.isActive,
                status: !job.isActive ? 'pending' : 'paused'
            });
            setJobs(jobs.map(j => j._id === job._id ? data : j));
            setAlert({ type: 'success', message: `Protocol ${!job.isActive ? 'resumed' : 'paused'}.` });
        } catch (err) {
            setAlert({ type: 'error', message: 'Uplink failed.' });
        }
    };

    const handleDelete = async (jobId) => {
        const proceed = await confirm({
            title: 'Terminate Job?',
            message: 'Permanently remove the scheduling protocol from the registry?',
            type: 'danger',
            confirmText: 'Terminate'
        });
        if (proceed) {
            try {
                await axios.delete(`http://localhost:5005/api/scheduling/job/${jobId}`);
                setJobs(jobs.filter(j => j._id !== jobId));
                setAlert({ type: 'success', message: 'Job terminated.' });
            } catch (err) {
                setAlert({ type: 'error', message: 'De-registration failed.' });
            }
        }
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isTyping) return;

        const cmd = input.toLowerCase();
        setInput('');
        setIsTyping(true);

        // Simulate AI intelligence for scheduling
        setTimeout(() => {
            if (cmd.includes('new') || cmd.includes('add') || cmd.includes('create') || cmd.includes('schedule')) {
                setIsAddModalOpen(true);
            } else if (cmd.includes('refresh') || cmd.includes('sync')) {
                fetchJobs();
                setAlert({ type: 'info', message: 'Neural registry synchronized.' });
            } else if (cmd.includes('search') || cmd.includes('filter')) {
                // UI already has filters, but we can acknowledge
                setAlert({ type: 'info', message: 'Filtering neural results...' });
            }
            setIsTyping(false);
        }, 800);
    };

    const getNextRunTime = (job) => {
        const now = new Date();
        const [hours, minutes] = job.time.split(':').map(Number);
        let next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (job.mode === 'one-time') {
            next = new Date(job.date + 'T' + job.time);
        } else if (job.mode === 'daily') {
            if (next <= now) next.setDate(next.getDate() + 1);
        } else if (job.mode === 'weekly') {
            let daysUntil = (job.dayOfWeek - now.getDay() + 7) % 7;
            if (daysUntil === 0 && next <= now) daysUntil = 7;
            next.setDate(now.getDate() + daysUntil);
        }
        return next.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const ScheduleCard = ({ job }) => (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex justify-start mb-4 group`}
        >
            <div className="flex flex-col gap-1 max-w-[90%]">
                <div className="flex items-center gap-1.5 px-1">
                    <Activity size={10} className="text-secondary opacity-70" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Scheduler Bot</span>
                </div>
                
                <div className={`p-5 glass-euphoria border border-white/5 rounded-[24px] rounded-tl-sm transition-all shadow-xl hover:border-secondary/20 min-w-[320px] ${!job.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-col">
                            <h4 className="text-[12px] font-black text-white truncate max-w-[200px] uppercase tracking-tight">{new URL(job.url).hostname}</h4>
                            <p className="text-[8px] font-mono text-slate-500 truncate mt-0.5">{job.url}</p>
                        </div>
                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            job.status === 'running' ? 'bg-secondary/10 text-secondary animate-pulse' : 
                            job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-600'
                        }`}>
                            {job.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Zap size={8} /> Mode
                            </p>
                            <p className="text-[10px] font-bold text-white uppercase">{job.mode}</p>
                        </div>
                        <div className="p-2 bg-black/40 rounded-xl border border-white/5">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Clock size={8} /> Trigger
                            </p>
                            <p className="text-[10px] font-bold text-white">{job.time}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleToggleActive(job)}
                                className={`size-8 rounded-lg flex items-center justify-center border transition-all ${
                                    job.isActive ? 'hover:bg-amber-500/10 border-amber-500/20 text-amber-500' : 'hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                }`}
                            >
                                {job.isActive ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                            <button 
                                onClick={() => handleDelete(job._id)}
                                className="size-8 rounded-lg flex items-center justify-center border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 text-slate-500 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <div className="text-right">
                            <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Next Run</p>
                            <p className="text-[9px] font-bold text-secondary">{job.isActive ? getNextRunTime(job) : 'Disabled'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="h-full flex flex-col glass-node overflow-hidden">
            {/* Header */}
            <div className="flex-none p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="size-9 bg-secondary/10 rounded-xl flex items-center justify-center border border-secondary/20 shadow-neon">
                        <Calendar className="text-secondary size-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-white">Neural Scheduler Hub</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{jobs.length} Active Protocols</span>
                            <div className="size-1 bg-secondary animate-ping rounded-full" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                         onClick={() => setIsAddModalOpen(true)}
                         className="px-4 py-2 bg-secondary/10 hover:bg-secondary border border-secondary/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-secondary hover:text-white transition-all flex items-center gap-2 shadow-neon group"
                    >
                        <Plus size={12} className="group-hover:rotate-90 transition-transform" /> Register Job
                    </button>
                </div>
            </div>

            {/* Content / Chat Flow */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[var(--eu-bg-void)]">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                        <Loader2 className="animate-spin text-secondary" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Synchronizing Neural Lattice...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6 opacity-40">
                        <div className="size-16 bg-white/5 rounded-3xl flex items-center justify-center border border-dashed border-white/20">
                            <Shield size={32} className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-white mb-2">Registry Empty</p>
                            <p className="text-[9px] text-slate-500">No autonomous cycles are currently deployed. Use the intake form to initialize a new scheduling sequence.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 pb-20">
                        <SystemBubble content="Registry Link Established" icon={Activity} />
                        
                        {/* Grouped Rendering as Chat Messages */}
                        {jobs
                            .filter(j => {
                                const matchesUrl = j.url.toLowerCase().includes(filter.url.toLowerCase());
                                const matchesType = filter.type === 'all' || j.scanType === filter.type;
                                return matchesUrl && matchesType;
                            })
                            .map(job => (
                                <ScheduleCard key={job._id} job={job} />
                            ))}

                        {isTyping && (
                           <div className="flex justify-start">
                               <div className="flex gap-1.5 p-3 bg-white/5 rounded-xl border border-white/10">
                                   {[0, 1, 2].map(i => (
                                       <motion.div key={i}
                                           animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                                           transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                           className="size-1 bg-secondary rounded-full" />
                                   ))}
                               </div>
                           </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Footer / Filter & Input */}
            <div className="flex-none p-4 border-t border-white/10 bg-black/40 space-y-4">
                 {/* Filters */}
                 <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    <div className="relative shrink-0 w-48">
                        <SearchIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-1.5 text-[9px] text-white uppercase font-black outline-none focus:border-secondary/30 transition-all tracking-widest"
                            value={filter.url}
                            onChange={(e) => setFilter({...filter, url: e.target.value})}
                        />
                    </div>
                    {['quick', 'full'].map(t => (
                        <button key={t} onClick={() => setFilter(f => ({...f, type: f.type === t ? 'all' : t}))}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${filter.type === t ? 'bg-secondary text-white border-secondary' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/20'}`}>
                            {t === 'quick' ? 'Pulse' : 'Tactical Audit'}
                        </button>
                    ))}
                 </div>

                 {/* Simulated Chat Input */}
                 <form onSubmit={handleSend} className="relative">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <Bot size={14} className="text-secondary opacity-50" />
                        <div className="w-[1px] h-4 bg-white/10" />
                     </div>
                     <input 
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Command Bot: 'Schedule google.com daily'..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-14 pr-14 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-secondary/30 transition-all font-medium"
                     />
                     <button 
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="absolute right-3 top-1/2 -translate-y-1/2 size-9 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white rounded-xl flex items-center justify-center transition-all shadow-neon disabled:opacity-20"
                     >
                        <Send size={16} />
                     </button>
                 </form>
            </div>

            <AnimatePresence>
                {isAddModalOpen && (
                    <AddJobModal 
                        isOpen={isAddModalOpen}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            fetchJobs();
                        }}
                        setAlert={setAlert}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Tactical Helper: Search Icon
const SearchIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

export default SchedulingDashboard;
