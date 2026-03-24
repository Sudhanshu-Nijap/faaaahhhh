import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Cpu, Terminal, Activity, Globe, Lock } from 'lucide-react';

const IndustrialFeature = () => {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 opacity-30 animate-pulse" />
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Feature 1: Industrial Grade */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-10 border-l-4 border-l-primary relative group"
          >
            <div className="absolute -top-4 -right-4 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
            <div className="flex items-center gap-4 mb-8">
               <div className="size-12 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-neon">
                  <Shield className="text-primary size-6" />
               </div>
               <span className="text-[10px] font-black tracking-industrial text-primary uppercase">Hardened Protocol</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 uppercase tracking-tight-mega font-outfit">
              Industrial Grade<br/>
              <span className="text-primary">Audit Shell</span>
            </h2>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-10 font-outfit uppercase tracking-widest opacity-80">
              Battle-tested infrastructure designed for mass-scale vulnerability orchestration. Our kernel-level scanners bypass standard obfuscation to reveal technical debt and structural weaknesses in real-time.
            </p>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Response Latency</p>
                  <p className="text-xl font-mono text-white tracking-tighter">0.02ms</p>
               </div>
               <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Encryption Layer</p>
                  <p className="text-xl font-mono text-white tracking-tighter">AES-256-X</p>
               </div>
            </div>
          </motion.div>

          {/* Feature 2: Security Operations */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-10 border-l-4 border-l-emerald-500 relative group"
          >
            <div className="absolute -top-4 -right-4 size-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="flex items-center gap-4 mb-8">
               <div className="size-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Activity className="text-emerald-500 size-6" />
               </div>
               <span className="text-[10px] font-black tracking-industrial text-emerald-500 uppercase">Operational Intel</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 uppercase tracking-tight-mega font-outfit">
              Security<br/>
              <span className="text-emerald-500">Operations Center</span>
            </h2>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-10 font-outfit uppercase tracking-widest opacity-80">
              Autonomous SOC integration leveraging Gemini 2.5 architecture. Transform raw vulnerability data into tactical summaries, multi-channel alerts, and zero-click remediation workflows.
            </p>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">GPT-Core Link</p>
                  <p className="text-xl font-mono text-white tracking-tighter italic text-emerald-500">Active</p>
               </div>
               <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Threat Detection</p>
                  <p className="text-xl font-mono text-white tracking-tighter">99.9% Acc</p>
               </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default IndustrialFeature;
