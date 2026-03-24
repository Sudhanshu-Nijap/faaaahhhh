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
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 lg:mb-16 gap-10 lg:gap-20">
          <div className="w-full">
            <h2 className="font-outfit text-4xl sm:text-5xl md:text-7xl font-black mb-8 sm:mb-10 flex items-center gap-6 uppercase tracking-tight-mega premium-gradient-text leading-none">
              Protocols
            </h2>
            <p className="text-slate-500 max-w-xl text-[10px] sm:text-[12px] font-black leading-[2] uppercase tracking-[0.25em] opacity-40">
              Multi-layer autonomous validation engine for critical digital infrastructure systems. // Node Integration 0x741
            </p>
          </div>
          <div className="w-fit bg-primary/5 border border-primary/20 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-primary font-mono text-[9px] sm:text-[10px] tracking-industrial uppercase font-black mb-2 shadow-neon self-start lg:self-auto">
            ACTIVE: 0xFD42-S3N
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel group !p-8 relative overflow-hidden"
            >
              <div className="relative z-10 h-full flex flex-col items-start text-left">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-10 text-primary border border-primary/20 shadow-neon-strong group-hover:scale-110 transition-transform duration-700">
                  {React.cloneElement(step.icon, { size: 24 })}
                </div>
                <h3 className="font-outfit text-2xl font-black mb-6 uppercase tracking-tight-mega premium-gradient-text leading-none">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-[10px] leading-[2] font-black uppercase tracking-[0.15em] opacity-60 mb-10 text-justify" style={{ textAlignLast: 'left' }}>
                  {step.desc}
                </p>
                
                <div className="mt-auto h-px w-full bg-gradient-to-r from-primary/20 to-transparent group-hover:from-primary/50 transition-all duration-700" />
              </div>

              {/* Decorative Corner */}
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary/20 rounded-tr-3xl group-hover:border-primary transition-colors duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
