import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Search, Globe, Shield, Sparkles, ArrowRight, Loader2, Zap, Target, Cpu } from 'lucide-react';
import axios from 'axios';

const ScanForm = ({ onScanStarted }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [chaosIntensity, setChaosIntensity] = useState('standard');
  const [showScheduling, setShowScheduling] = useState(false);
  const [schedule, setSchedule] = useState({
    scanType: 'quick',
    mode: 'one-time',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    dayOfWeek: 1
  });


  // Mouse tilt effect logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const normalizeUrl = (input) => {
    let trimmed = input.trim();
    if (!trimmed) return "";
    
    // Check if it already has a protocol
    if (!/^(https?:\/\/)/i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  };

  const validateUrl = (urlToTest) => {
    try {
      // Basic format check before using URL constructor
      const pattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
      if (!pattern.test(urlToTest)) return false;
      
      const parsed = new URL(urlToTest);
      return !!parsed.hostname && parsed.hostname.includes('.');
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Target URL is required');
      return;
    }

    const targetUrl = normalizeUrl(url);
    
    if (!validateUrl(targetUrl)) {
      setError('Invalid URL format. Please enter a valid domain.');
      return;
    }
    
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      if (showScheduling) {
        // Create a scheduled job
        await axios.post('http://localhost:5005/api/scheduling/jobs', {
          ...schedule,
          url: targetUrl,
          userId
        });
        setUrl('');
        setShowScheduling(false);
        // We might want a callback here to notify parent about new job
      } else {
        // Run immediate scan
        const response = await axios.post('http://localhost:5005/api/scan', { 
          url: targetUrl, 
          userId,
          chaosIntensity 
        });
        onScanStarted(response.data.reportId);
        setUrl('');
      }
    } catch (err) {

      console.error('Scan initiation failed', err);
      setError(err.response?.data?.error || 'System failed to initiate protocol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full relative py-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="w-full max-w-3xl mx-auto relative z-20"
      >
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute -inset-1 bg-transparent rounded-[32px] blur-2xl transition-opacity duration-700" />
          
          <div className={`relative bg-white dark:bg-black p-2 sm:p-3 transition-all duration-500 border border-[var(--eu-glass-border)] ${error ? 'border-primary/50 shadow-[0_0_20px_rgba(var(--eu-accent-rgb),0.1)]' : 'group-focus-within:border-primary/50 group-focus-within:glow-shadow'} rounded-[24px] sm:rounded-[28px] shadow-2xl`}>
            <div className="flex flex-col md:flex-row items-center gap-2 sm:gap-4">
              <div className="flex-1 relative flex items-center w-full">
                <div className="absolute left-5 sm:left-6 text-text-muted/50 group-focus-within:text-primary transition-colors">
                  <Globe size={18} className="sm:size-[20px]" />
                </div>
                <input 
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Infrastructure URL (e.g., https://example.com)"
                  className="w-full h-14 sm:h-16 bg-transparent border-none pl-12 sm:pl-16 pr-4 sm:pr-6 text-sm sm:text-lg font-bold focus:outline-none text-[var(--eu-text-main)] placeholder-[var(--eu-text-main)] placeholder:opacity-20"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="btn-premium px-8 sm:px-10 h-14 sm:h-16 text-white rounded-[18px] sm:rounded-[20px] transition-all active:scale-[0.98] font-black uppercase tracking-widest text-[10px] sm:text-xs disabled:opacity-50 w-full md:w-auto overflow-hidden group"
              >
                <div className="flex items-center justify-center gap-3 relative z-10">
                  {loading ? (
                    <Loader2 size={20} className="animate-spin sm:size-[24px]" />
                  ) : (
                    <>
                      <span>{showScheduling ? 'Confirm Schedule' : 'Initiate Protocol'}</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform sm:size-[18px]" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <button
               type="button"
               onClick={() => setShowScheduling(!showScheduling)}
               className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all ${
                 showScheduling 
                  ? 'bg-eu-accent/10 border-eu-accent/30 text-eu-accent shadow-neon' 
                  : 'bg-[var(--eu-bg-void)] border-[var(--eu-glass-border)] text-text-muted/60 opacity-60 hover:opacity-100'
               }`}
            >
               <Calendar size={12} className={showScheduling ? 'animate-pulse' : ''} />
               <span className="text-[9px] font-black uppercase tracking-widest">
                 {showScheduling ? 'Cancel Scheduling' : 'Automate Lifecycle'}
               </span>
            </button>
            
            <div className="w-[1px] h-4 bg-white/5 hidden sm:block" />

            <div className="flex items-center gap-3 bg-[var(--eu-bg-void)] px-4 py-2 rounded-2xl border border-[var(--eu-glass-border)]">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted/60">Chaos Intensity:</span>
              <div className="flex gap-1.5 p-1 bg-[var(--eu-bg-void)]/20 rounded-xl">
                {['minimal', 'standard', 'maximum'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setChaosIntensity(level)}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                      chaosIntensity === level 
                        ? 'bg-primary text-white shadow-neon scale-105' 
                      : 'text-[var(--eu-text-main)] opacity-40 hover:opacity-100 hover:bg-[var(--eu-bg-void)]/10'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showScheduling && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="mt-6 p-6 glass-euphoria border border-[var(--eu-glass-border)] rounded-[32px] overflow-hidden relative shadow-2xl"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-eu-accent to-violet-500 opacity-30" />
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4 border-b border-white/5 pb-2">Diagnostic Profile</h4>
                      <div className="flex gap-4">
                        {['quick', 'full'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSchedule({...schedule, scanType: t})}
                            className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                              schedule.scanType === t 
                                ? 'bg-primary/20 border-primary/40 text-primary shadow-neon-small scale-[1.02]' 
                                : 'bg-black/20 border-white/5 text-muted hover:border-white/10'
                            }`}
                          >
                            <div className="text-[10px] font-black uppercase tracking-widest">{t === 'quick' ? 'Pulse' : 'Audit'}</div>
                            <div className="text-[8px] opacity-40 uppercase tracking-tighter mt-0.5">{t === 'quick' ? 'Basic Telemetry' : 'Deep Neural Forge'}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4 border-b border-white/5 pb-2">Neural Cycle</h4>
                      <div className="flex gap-3">
                        {['one-time', 'daily', 'weekly'].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSchedule({...schedule, mode: m})}
                            className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
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

                  <div className="w-[1px] bg-white/5 hidden md:block" />

                  <div className="flex-1 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-4 border-b border-white/5 pb-2">Tactical Window</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-muted uppercase tracking-widest">Execution Time</label>
                           <input 
                             type="time" 
                             className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-eu-accent/50"
                             value={schedule.time}
                             onChange={(e) => setSchedule({...schedule, time: e.target.value})}
                           />
                        </div>

                        {schedule.mode === 'one-time' && (
                          <div className="space-y-2">
                             <label className="text-[8px] font-black text-muted uppercase tracking-widest">Target Date</label>
                             <input 
                               type="date" 
                               className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-eu-accent/50"
                               value={schedule.date}
                               onChange={(e) => setSchedule({...schedule, date: e.target.value})}
                             />
                          </div>
                        )}

                        {schedule.mode === 'weekly' && (
                          <div className="space-y-2">
                             <label className="text-[8px] font-black text-muted uppercase tracking-widest">Day of Epoch</label>
                             <select 
                               className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-eu-accent/50 appearance-none"
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
                    
                    <div className="bg-white/5 p-4 rounded-2xl border border-dashed border-white/10">
                       <p className="text-[8px] font-medium text-muted leading-relaxed uppercase tracking-widest">
                         Note: Automated audits will be dispatched from the unified substrate. Ensure target infrastructure allows standard crawler headers.
                       </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute -bottom-14 left-0 right-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-primary/10 backdrop-blur-xl border border-primary/20 px-6 py-2.5 rounded-2xl flex items-center gap-3 shadow-[0_10px_30px_-10px_rgba(var(--eu-accent-rgb),0.3)]">
                  <div className="size-5 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                    <Sparkles size={10} className="animate-pulse" />
                  </div>
                  <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                    System Failure: <span className="text-white/80">{error}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-4 sm:gap-8 opacity-40 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
           <div className="flex items-center gap-2">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--eu-glow)]" />
              <span>Diagnostic Ready</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-eu-accent-violet shadow-[0_0_8px_var(--eu-glow-violet)]" />
              <span>Nodes Synchronized</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ScanForm;
