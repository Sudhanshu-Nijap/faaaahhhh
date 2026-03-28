import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Activity, RefreshCw, Cpu } from 'lucide-react';

const AboutUs = () => {

  return (
    <section className="w-full flex flex-col items-center">
      <div className="max-w-6xl w-full mx-auto flex flex-col lg:flex-row gap-8 lg:gap-20 px-6">
        <div className="w-full lg:w-5/12 py-4 lg:py-8">
          <motion.h2 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-outfit text-2xl sm:text-3xl lg:text-4xl font-black mb-6 lg:mb-8 leading-tight premium-gradient-text uppercase"
          >
            Technical<br className="hidden sm:block" />Specifications
          </motion.h2>
          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            {[
              {
                title: "Diagnostic Logic",
                detail: "Full DOM tree analysis and multi-layer URL crawling for vulnerability detection."
              },
              {
                title: "Security Core",
                detail: "BCrypt password hashing and JWT (JSON Web Token) session persistence."
              },
              {
                title: "Classification",
                detail: "AI-modeled risk assessment engine with category-specific diagnostic scoring."
              }
            ].map((spec, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <span className="text-primary font-black text-[10px] tracking-industrial uppercase opacity-80">{spec.title}</span>
                <p className="text-[var(--eu-text-muted)] font-outfit text-xs sm:text-sm uppercase tracking-widest leading-relaxed">
                  {spec.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 lg:pl-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative group h-full flex flex-col justify-center py-6 lg:py-0"
          >
            <div className="absolute -inset-10 bg-primary/10 blur-[120px] rounded-full opacity-50 group-hover:opacity-70 transition-opacity" />
            
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Main Spec Card */}
              <div className="sm:col-span-2 glass-panel p-5 rounded-[28px] border-white/5 border grid grid-cols-1 md:grid-cols-[auto_1fr] items-start gap-4 lg:gap-6">
                <div className="relative shrink-0 mx-auto md:mx-0">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <div className="relative size-16 lg:size-20 bg-slate-950 border border-white/10 rounded-[24px] flex items-center justify-center shadow-2xl">
                     <Cpu size={32} className="text-primary glow-primary animate-float" />
                  </div>
                </div>
                <div className="text-center md:text-left pt-2">
                   <h3 className="text-white font-black text-lg uppercase tracking-tighter italic mb-2 leading-none"></h3>
                   <div className="space-y-3">
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-neon" />
                        <span className="text-[9px] font-black tracking-industrial text-[var(--eu-text-muted)] uppercase">System Integrity: Optimal</span>
                      </div>
                      <p className="text-slate-500 text-[9px] font-bold leading-relaxed uppercase tracking-widest max-w-[280px] mx-auto md:mx-0 opacity-80">
                        Automated diagnostic system utilizing headless browser clusters and deep-packet inspection protocols.
                      </p>
                   </div>
                </div>
              </div>

              {/* Stat Card 1 */}
              <div className="glass-panel p-4 pb-5 rounded-[24px] border-white/5 border">
                <span className="text-[8px] font-black tracking-industrial text-primary uppercase opacity-60">TechStack</span>
                <p className="text-base sm:text-lg font-black text-white mt-1 tracking-tighter break-all">MERN_P_v4.2</p>
              </div>

              {/* Stat Card 2 */}
              <div className="glass-panel p-4 pb-5 rounded-[24px] border-white/5 border">
                <span className="text-[8px] font-black tracking-industrial text-primary uppercase opacity-60">Protocols</span>
                <p className="text-base sm:text-lg font-black text-white mt-1 tracking-tighter break-all">SEC_UI_UX</p>
              </div>


              {/* Terminal Code Block */}
              <div className="sm:col-span-2 glass-panel p-5 rounded-[24px] border-white/5 border overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-1.5 rounded-full bg-primary/40" />
                  <div className="size-1.5 rounded-full bg-primary/40" />
                  <div className="size-1.5 rounded-full bg-primary/40" />
                  <span className="ml-1 text-[7px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest">Initialization_Log</span>
                </div>
                <code className="text-[8px] sm:text-[9px] font-mono text-primary/80 leading-relaxed block opacity-90 break-all md:break-words">
                  {`> MOUNTING_CORE_MODULES...
> CONNECTING_MONGODB_ATLAS...
> SPAWNING_PUPPETEER_INSTANCE...
> BOOTING_LIGHTHOUSE_ENGINE...
> SERVICE_STATUS: OPERATIONAL_v4.2`}
                </code>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
