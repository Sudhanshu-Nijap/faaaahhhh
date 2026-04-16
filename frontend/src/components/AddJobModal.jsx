import { API_URL, SOCKET_URL } from '../config/api';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Zap, Activity, Globe, Loader2 } from 'lucide-react';
import axios from 'axios';

const AddJobModal = ({ isOpen, onClose, initialUrl = '', setAlert }) => {
    const [url, setUrl] = useState(initialUrl);
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState({
        scanType: 'quick',
        mode: 'one-time',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        dayOfWeek: 1
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!url) return;

        // Auto-normalize URL (Add protocol if missing)
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = `https://${normalizedUrl}`;
        }

        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            await axios.post(`${API_URL}/api/scheduling/jobs`, {
                ...schedule,
                url: normalizedUrl,
                userId
            });
            setAlert({ type: 'success', message: 'Scheduling protocol established.' });
            onClose();
        } catch (err) {
            setAlert({ type: 'error', message: 'Uplink failed: Registration rejected.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-2xl glass-euphoria border border-[var(--eu-glass-border)] rounded-[40px] overflow-hidden shadow-2xl"
            >
                <div className="p-8 sm:p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="size-12 bg-eu-accent/10 rounded-2xl flex items-center justify-center border border-eu-accent/20">
                                <Calendar className="text-eu-accent" size={20} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight text-white font-outfit">Initialize Schedule</h2>
                                <p className="text-[10px] font-black text-muted uppercase tracking-widest mt-1">Status: Ready for Target Acquisition</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="size-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-muted transition-all">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* URL Target */}
                        <div className="relative group">
                            <Globe size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-eu-accent transition-colors" />
                            <input 
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Target Infrastructure URL (https://...)"
                                className="w-full bg-[var(--eu-bg-void)] border border-[var(--eu-glass-border)] rounded-2xl pl-14 pr-6 py-4 text-sm font-bold text-white outline-none focus:border-eu-accent/50 transition-all font-outfit"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Left Column: Diagnostics */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 border-b border-white/5 pb-2">Diagnostic Profile</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['quick', 'full'].map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setSchedule({...schedule, scanType: t})}
                                                className={`py-3 px-4 rounded-xl border transition-all text-left ${
                                                schedule.scanType === t 
                                                    ? 'bg-primary/20 border-primary/40 text-primary shadow-neon-small scale-[1.02]' 
                                                    : 'bg-black/20 border-white/5 text-muted hover:border-white/10'
                                                }`}
                                            >
                                                <div className="text-[10px] font-black uppercase tracking-widest">{t === 'quick' ? 'Pulse' : 'Audit'}</div>
                                                <div className="text-[8px] opacity-40 uppercase tracking-tighter mt-0.5">{t === 'quick' ? 'Fast Scrutiny' : 'Deep Neural Forge'}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 border-b border-white/5 pb-2">Temporal Cycle</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['one-time', 'daily', 'weekly'].map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setSchedule({...schedule, mode: m})}
                                                className={`py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                                                schedule.mode === m 
                                                    ? 'bg-eu-accent/20 border-eu-accent/40 text-eu-accent shadow-neon-small' 
                                                    : 'bg-black/20 border-white/5 text-muted'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Windows */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 border-b border-white/5 pb-2">Execution window</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                                <Clock size={10} /> Time UTC+5:30
                                            </label>
                                            <input 
                                                type="time" 
                                                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-eu-accent/50 font-mono"
                                                value={schedule.time}
                                                onChange={(e) => setSchedule({...schedule, time: e.target.value})}
                                            />
                                        </div>

                                        {schedule.mode === 'one-time' && (
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={10} /> Calendar Target
                                                </label>
                                                <input 
                                                    type="date" 
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-eu-accent/50 font-mono"
                                                    value={schedule.date}
                                                    onChange={(e) => setSchedule({...schedule, date: e.target.value})}
                                                />
                                            </div>
                                        )}

                                        {schedule.mode === 'weekly' && (
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                                    <Activity size={10} /> Recurrence Day
                                                </label>
                                                <select 
                                                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-eu-accent/50 appearance-none cursor-pointer"
                                                    value={schedule.dayOfWeek}
                                                    onChange={(e) => setSchedule({...schedule, dayOfWeek: parseInt(e.target.value)})}
                                                >
                                                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                                                        <option key={d} value={i} className="bg-[#0a0a0c]">{d}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading || !url}
                            className="w-full py-5 bg-eu-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-neon hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-3"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : (
                                <>
                                    <Zap size={16} />
                                    Authorize Scheduling Protocol
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default AddJobModal;
