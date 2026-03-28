import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, Activity, Lock, Cpu, Database, Bug, BarChart } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Globe />,
      title: "Site Mapping",
      desc: "Autonomous crawlers execute deep-traversal discovery to map your entire application perimeter.",
      status: "MAP_COMPLETE"
    },
    {
      icon: <Shield />,
      title: "Technical Audit",
      desc: "Lighthouse-driven performance, accessibility, and security header validation at scale.",
      status: "CORE_SCAN"
    },
    {
      icon: <Cpu />,
      title: "Gemini Intelligence",
      desc: "Gemini 2.5 Flash synthesizes cross-tool data to provide Senior Architect-level insights.",
      status: "AI_ONLINE"
    },
    {
      icon: <BarChart />,
      title: "API & Interaction",
      desc: "Newman and Cypress protocols verify REST architectural integrity and UI flow stability.",
      status: "TEST_SYNC"
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
                y: -8,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
              }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel group p-6 relative overflow-hidden flex flex-col"
            >
              {/* Animated Scanning Beam on Hover */}
              <motion.div 
                initial={{ top: '-100%' }}
                whileHover={{ top: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-primary/10 to-transparent z-0 pointer-events-none"
              />

              <div className="relative z-10 h-full flex flex-col items-start text-left flex-1">
                <motion.div 
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary border border-primary/20 shadow-neon-strong group-hover:bg-primary/20 transition-all duration-500"
                >
                  {React.cloneElement(step.icon, { size: 20, className: "group-hover:animate-pulse" })}
                </motion.div>
                
                <motion.h3 
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: (index * 0.1) + 0.3 }}
                  className="font-outfit text-xl font-black mb-4 uppercase tracking-tight-mega premium-gradient-text leading-none"
                >
                  {step.title}
                </motion.h3>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.6 }}
                  transition={{ delay: (index * 0.1) + 0.4 }}
                  className="text-muted text-[9px] leading-[1.8] font-black uppercase tracking-[0.15em] mb-6 text-justify group-hover:opacity-80 transition-opacity" 
                  style={{ textAlignLast: 'left' }}
                >
                  {step.desc}
                </motion.p>
                
                <div className="mt-auto w-full space-y-3">
                  <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-widest text-muted">
                    <span>Protocol_{step.status}</span>
                    <span className="text-primary/40">Active</span>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-primary/20 to-transparent group-hover:from-primary/60 transition-all duration-700" />
                </div>
              </div>

              {/* Decorative Corner with Rotation */}
              <motion.div 
                whileHover={{ rotate: 90 }}
                className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary/20 rounded-tr-3xl group-hover:border-primary transition-colors duration-700 pointer-events-none" 
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
