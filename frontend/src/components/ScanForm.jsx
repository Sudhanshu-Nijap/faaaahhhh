import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Search, Globe, Shield, Sparkles, ArrowRight, Loader2, Zap, Target, Cpu } from 'lucide-react';
import axios from 'axios';

const ScanForm = ({ onScanStarted }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [chaosIntensity, setChaosIntensity] = useState('standard');

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
      const response = await axios.post('http://localhost:5000/api/scan', { 
        url: targetUrl, 
        userId,
        chaosIntensity 
      });
      onScanStarted(response.data.reportId);
      setUrl('');
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
                      <span>Initiate Protocol</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform sm:size-[18px]" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
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
