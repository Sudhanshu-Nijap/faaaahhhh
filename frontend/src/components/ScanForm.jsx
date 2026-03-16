import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Search, Globe, Shield, Sparkles, ArrowRight, Loader2, Zap, Target, Cpu } from 'lucide-react';
import axios from 'axios';

const ScanForm = ({ onScanStarted }) => {
  const [url, setUrl] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post('http://localhost:5000/api/scan', { url, userId });
      onScanStarted(response.data.reportId);
      setUrl('');
    } catch (error) {
      console.error('Scan initiation failed', error);
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
          
          <div className="relative glass-card p-3 transition-all duration-500 border-white/10 group-focus-within:border-primary/50 group-focus-within:glow-shadow rounded-[28px]">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 relative flex items-center w-full">
                <div className="absolute left-6 text-text-muted/50 group-focus-within:text-primary transition-colors">
                  <Globe size={20} />
                </div>
                <input 
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Target Infrastructure URL (e.g., https://example.com)"
                  className="w-full h-16 bg-transparent border-none pl-16 pr-6 text-lg font-bold focus:outline-none text-white placeholder-white/10"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="btn-premium px-10 h-16 text-white rounded-[20px] transition-all active:scale-[0.98] font-black uppercase tracking-widest text-xs disabled:opacity-50 w-full md:w-auto overflow-hidden group"
              >
                <div className="flex items-center justify-center gap-3 relative z-10">
                  {loading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <>
                      <span>Initiate Protocol</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 flex justify-center gap-8 opacity-40 text-[10px] font-black uppercase tracking-[0.2em]">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>Diagnostic Ready</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span>Nodes Synchronized</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ScanForm;
