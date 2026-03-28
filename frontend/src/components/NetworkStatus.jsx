import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Server, Activity, ShieldCheck, Zap } from 'lucide-react';

const NetworkStatus = () => {
  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="glass-panel rounded-[40px] p-12 relative overflow-hidden border-white/5 bg-[var(--eu-bg-card-glass)]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-10">
            <div className="flex items-center gap-6">
              <div className="h-px w-16 bg-primary" />
              <span className="text-[12px] font-black tracking-industrial text-primary uppercase">Global Node Integrity</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight-mega premium-gradient-text">
              Real-time System<br/>Surveillance
            </h2>
            
            <p className="text-[var(--eu-text-main)] opacity-40 text-xs md:text-sm leading-relaxed font-outfit uppercase tracking-widest max-w-sm">
              Continuous monitoring across 128 regional nodes ensures zero-latency diagnostic resolution for all enterprise assets.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-8">
              <div>
                <p className="text-3xl font-black text-[var(--eu-text-main)]">99.99%</p>
                <p className="text-[10px] font-black tracking-industrial text-[var(--eu-text-main)] opacity-40 uppercase mt-2">Uptime Core</p>
              </div>
              <div>
                <p className="text-3xl font-black text-[var(--eu-text-main)]">0.08s</p>
                <p className="text-[10px] font-black tracking-industrial text-[var(--eu-text-main)] opacity-40 uppercase mt-2">API Latency</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 relative">
            <div className="glass-panel p-8 rounded-[32px] border border-[var(--eu-glass-border)] bg-[var(--eu-bg-void)]/40 shadow-neon-strong backdrop-blur-2xl">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <div className="size-3 bg-primary rounded-full animate-pulse shadow-neon" />
                   <span className="text-[10px] font-black tracking-industrial text-[var(--eu-text-main)] uppercase">Operational Network Map</span>
                </div>
                <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-[9px] font-black tracking-widest text-[var(--eu-text-muted)] uppercase">
                   V6.4.2_NODE_SECURE
                </div>
              </div>

              {/* Decorative Data Visualization */}
              <div className="space-y-8">
              {[
                { label: "PRIMARY_GATEWAY", status: 100, color: "bg-primary" },
                { label: "AI_CLASSIFIER_LR", status: 100, color: "bg-primary" },
                { label: "DB_PERSISTENCE", status: 94, color: "bg-primary" },
                { label: "SECURE_AUTH_NODE", status: 99, color: "bg-primary" }
              ].map((node, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-widest">
                      <span className="text-[var(--eu-text-main)] opacity-40">{node.label}</span>
                      <span className="text-[var(--eu-text-main)]">{node.status}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                         initial={{ width: 0 }}
                         whileInView={{ width: `${node.status}%` }}
                         viewport={{ once: true }}
                         transition={{ duration: 1.5, delay: i * 0.2 }}
                         className={`h-full ${node.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-4 gap-4 opacity-40">
                 {Array.from({length: 8}).map((_, i) => (
                   <div key={i} className="h-4 bg-white/5 rounded-sm overflow-hidden relative">
                      <motion.div 
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        className="absolute inset-0 bg-primary/20"
                      />
                   </div>
                 ))}
              </div>
            </div>
            
            {/* Absolute Decorative Icons */}
            <div className="absolute -top-12 -right-8 size-24 glass-panel rounded-3xl border border-white/10 flex items-center justify-center -z-10 rotate-12 bg-primary/5">
               <ShieldCheck size={40} className="text-primary opacity-20" />
            </div>
            <div className="absolute -bottom-8 -left-12 size-20 glass-panel rounded-2xl border border-white/10 flex items-center justify-center -z-10 -rotate-6 bg-[var(--eu-bg-void)]">
               <Zap size={30} className="text-primary opacity-20" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;
