import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, Activity, Lock, Cpu, Database, Bug, BarChart, Zap, Terminal } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Globe />,
      title: "Neural Crawling",
      desc: "Autonomous Playwright crawlers execute deep-traversal discovery to map your application's DOM and network clusters via high-speed Socket uplink.",
      status: "MAP_PROTOCOL"
    },
    {
      icon: <Zap />,
      title: "Tactical Auditing",
      desc: "Parallel Lighthouse and Newman audits evaluate performance, accessibility, and API integrity in isolated Worker Threads for zero-latency execution.",
      status: "AUDIT_SYNC"
    },
    {
      icon: <Cpu />,
      title: "Sentinel Intelligence",
      desc: "The Sentinel 3.0 RAG engine synthesizes cross-tool telemetry to provide Senior Architect-level remediation insights and risk-stratified reports.",
      status: "SENTINEL_AI"
    },
    {
      icon: <Terminal />,
      title: "Patching Console",
      desc: "An integrated industrial IDE and Debug Console allow for real-time code patching, automated fix distillation, and instant remediation deployment.",
      status: "FIX_EXECUTE"
    }
  ];

  return (
    <section className="w-full flex flex-col items-center">
      <div className="max-w-6xl w-full mx-auto px-6 sm:px-10 lg:px-0">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 lg:mb-10 gap-8 lg:gap-12">
          <div className="w-full">
            <h2 className="font-outfit text-4xl sm:text-5xl md:text-6xl font-black mb-6 sm:mb-8 flex items-center gap-6 uppercase tracking-tight-mega premium-gradient-text leading-none">
              Protocols
            </h2>
            <p className="text-muted max-w-xl text-[10px] sm:text-[11px] font-black leading-[2] uppercase tracking-[0.25em] opacity-40">
              Multi-layer autonomous validation engine for critical digital infrastructure systems. // Node Integration 0x741
            </p>
          </div>
          <div className="w-fit bg-primary/5 border border-primary/20 px-6 py-2.5 rounded-xl text-primary font-mono text-[9px] sm:text-[10px] tracking-industrial uppercase font-black mb-2 shadow-neon self-start lg:self-auto">
            ACTIVE: 0xFD42-S3N
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2, ease: "easeOut" }
              }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel group p-6 rounded-[32px] relative overflow-hidden flex flex-col border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 shadow-lg hover:shadow-primary/10"
            >
              {/* Animated Scanning Beam on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all duration-500 group-hover:scale-110">
                 <span className="font-mono text-[40px] font-black italic">STEP_{index + 1}</span>
              </div>

              <div className="relative z-10 h-full flex flex-col items-start text-left flex-1">
                <motion.div 
                   animate={{ y: [0, -4, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                   className="mb-4 p-3 bg-primary/10 rounded-2xl w-fit border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-500"
                >
                  {React.cloneElement(step.icon, { size: 20, className: "text-primary group-hover:scale-110 transition-transform duration-300" })}
                </motion.div>
                
                <h3 className="text-base font-black uppercase tracking-tight text-white mb-2 group-hover:text-primary transition-colors relative z-10">
                  {step.title}
                </h3>
                
                <p className="text-[var(--eu-text-muted)] text-[10px] md:text-xs leading-relaxed font-outfit uppercase tracking-widest group-hover:opacity-100 transition-opacity text-justify relative z-10 mb-8" 
                   style={{ textAlignLast: 'left' }}
                >
                  {step.desc}
                </p>
                
                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between w-full relative z-10">
                   <span className="text-[9px] font-mono tracking-widest text-[var(--eu-text-muted)] uppercase italic">Protocol_{step.status}</span>
                   <div className="flex items-center gap-1.5">
                      <motion.div 
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--eu-glow)]" 
                      />
                      <span className="text-[7px] font-black text-primary/50 uppercase tracking-tighter">Live</span>
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
