import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Search, Globe, Shield, Sparkles, ArrowRight, Loader2, Zap, Target, Cpu } from 'lucide-react';
import axios from 'axios';

const ScanForm = ({ onScanStarted }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await axios.post('http://localhost:5000/api/scan', { url: targetUrl, userId });
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
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-[32px] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
          
          <div className={`relative glass-card p-2 sm:p-3 transition-all duration-500 border-white/10 ${error ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 'group-focus-within:border-primary/50 group-focus-within:glow-shadow'} rounded-[24px] sm:rounded-[28px]`}>
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
                  className="w-full h-14 sm:h-16 bg-transparent border-none pl-12 sm:pl-16 pr-4 sm:pr-6 text-sm sm:text-lg font-bold focus:outline-none text-white placeholder-white/10"
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
          
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -bottom-10 left-0 right-0 flex items-center justify-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest"
              >
                <Sparkles size={12} className="animate-pulse" />
                <span>Error: {error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-4 sm:gap-8 opacity-40 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
           <div className="flex items-center gap-2">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>Diagnostic Ready</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span>Nodes Synchronized</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ScanForm;
