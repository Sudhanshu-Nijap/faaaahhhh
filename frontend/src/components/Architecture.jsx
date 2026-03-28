import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Cpu, Database, Layout, Shield, Zap, ArrowRight, Share2 } from 'lucide-react';

const Node = ({ icon: Icon, title, desc, delay = 0, color = "primary" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className="glass-panel p-6 border-white/5 relative group w-64 md:w-full"
  >
    <div className={`size-12 rounded-xl flex items-center justify-center mb-6 bg-${color}/10 border border-${color}/20 text-${color} shadow-neon`}>
      <Icon size={24} />
    </div>
    <h4 className="text-sm font-black uppercase text-white mb-2 tracking-tight transition-colors group-hover:text-primary">{title}</h4>
    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-black leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
      {desc}
    </p>
  </motion.div>
);

const Connector = ({ delay = 0, rotated = false }) => (
  <div className={`flex items-center justify-center ${rotated ? 'flex-col h-16' : 'w-16 hidden md:flex'}`}>
     <motion.div 
       initial={{ scaleX: 0 }}
       whileInView={{ scaleX: 1 }}
       viewport={{ once: true }}
       transition={{ delay, duration: 1 }}
       className={`h-0.5 bg-gradient-to-r from-primary/50 to-transparent flex-1`}
     />
     <motion.div
       initial={{ opacity: 0 }}
       whileInView={{ opacity: 1 }}
       viewport={{ once: true }}
       transition={{ delay: delay + 0.5 }}
     >
        <ArrowRight size={16} className={`text-primary/50 ${rotated ? 'rotate-90' : ''}`} />
     </motion.div>
  </div>
);

const Architecture = () => {
  return (
    <section id="architecture" className="w-full py-24 px-6 md:px-10 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[200px] -z-10" />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col mb-20 gap-6 text-center items-center">
          <div className="flex items-center gap-6">
            <div className="h-px w-10 bg-primary/30" />
            <span className="text-[12px] font-black tracking-industrial text-primary uppercase opacity-60">System Protocol 0xDA2</span>
            <div className="h-px w-10 bg-primary/30" />
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tight-mega premium-gradient-text leading-none">
            Infrastructure<br />Architecture
          </h2>
        </div>

        {/* Desktop Architecture View */}
        <div className="hidden md:flex flex-col gap-12 items-center">
          <div className="flex items-center gap-8 w-full justify-center">
             <Node icon={Globe} title="Target Node" desc="Public or Private tactical URL input perimeter." delay={0.1} />
             <Connector delay={0.3} />
             <Node icon={Cpu} title="Gemini 2.5 Node" desc="Neural reasoning cluster for vulnerability synthesis." delay={0.5} />
             <Connector delay={0.7} />
             <Node icon={Database} title="Lattice Storage" desc="Encrypted persistence for diagnostic archives." delay={0.9} color="primary" />
          </div>
          
          <div className="flex flex-col items-center">
             <Connector delay={1.1} rotated={true} />
             <div className="flex items-center gap-8 mt-4">
                <Node icon={Layout} title="The Neural Hub" desc="Symmetrical Multi-Panel Operational Interface." delay={1.3} />
                <Connector delay={1.5} />
                <Node icon={Share2} title="Classroom Relay" desc="Real-time session sharing protocol for SOC teams." delay={1.7} color="primary" />
             </div>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-6 items-center">
             <Node icon={Globe} title="Target Node" desc="tactical URL input." delay={0.1} />
             <Connector delay={0.2} rotated={true} />
             <Node icon={Cpu} title="Gemini 2.5 Node" desc="Neural reasoning." delay={0.3} />
             <Connector delay={0.4} rotated={true} />
             <Node icon={Layout} title="The Neural Hub" desc="Operational Interface." delay={0.5} />
        </div>

        <div className="mt-20 border-t border-white/5 py-12 flex flex-col gap-10">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">Protocol 01</p>
                 <p className="text-slate-400 text-[11px] leading-relaxed uppercase tracking-widest font-black opacity-60">High-Fidelity DOM Crawling using headless browser orchestration on isolated nodes.</p>
              </div>
              <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">Protocol 02</p>
                 <p className="text-slate-400 text-[11px] leading-relaxed uppercase tracking-widest font-black opacity-60">JWT (JSON Web Token) tactical persistence layered over MongoDB Atlas storage.</p>
              </div>
              <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase text-primary tracking-widest">Protocol 03</p>
                 <p className="text-slate-400 text-[11px] leading-relaxed uppercase tracking-widest font-black opacity-60">Real-time tactical synchronization via Socket.io neural uplink protocols.</p>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};

export default Architecture;
