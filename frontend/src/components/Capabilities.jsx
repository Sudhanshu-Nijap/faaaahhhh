import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Cpu, 
  Search, 
  Terminal, 
  Activity, 
  Zap, 
  Globe,
  Calendar,
  MessageSquare
} from 'lucide-react';

const CAPABILITIES = [
  {
    icon: <Search size={22} />,
    title: "On-Demand URL Scanning",
    desc: "Target any infrastructure URL for immediate security diagnostic protocols.",
    tag: "SCAN_CORE"
  },
  {
    icon: <Cpu size={22} />,
    title: "Sentinel AI Analysis",
    desc: "Advanced AI reasoning categorizes findings into risk-stratified architectural reports.",
    tag: "AI_SENTINEL"
  },
  {
    icon: <Terminal size={22} />,
    title: "Neural Debug Console",
    desc: "A full-spectrum IDE environment for real-time code patching and automated remediation synthesis.",
    tag: "DEBUG_IDE"
  },
  {
    icon: <Calendar size={22} />,
    title: "Neural Scheduler",
    desc: "Autonomous CRON-based diagnostic sweeps. Set your infrastructure for periodic, hands-off security monitoring.",
    tag: "AUTO_CRON"
  },
  {
    icon: <Zap size={22} />,
    title: "PDF Audit Reports",
    desc: "Generate professional technical reports instantly with high-density issue breakdowns.",
    tag: "REP_AUTH"
  },
  {
    icon: <MessageSquare size={22} />,
    title: "AI Neural Chat",
    desc: "Real-time technical dialogue with an AI architect specializing in complex remediation.",
    tag: "CHAT_SOC"
  }
];

const Capabilities = () => {
  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col mb-6 sm:mb-8 gap-4 px-4 sm:px-0">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight-mega premium-gradient-text leading-tight sm:leading-none">
          Industrial Grade<br className="hidden sm:block" />Security Operations
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CAPABILITIES.map((cap, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ 
              y: -5,
              transition: { duration: 0.2, ease: "easeOut" }
            }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="glass-panel p-6 rounded-3xl border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 group relative overflow-hidden shadow-lg hover:shadow-primary/10"
          >
            {/* Animated Background Pulse on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all duration-500 group-hover:scale-110">
               <span className="font-mono text-[40px] font-black italic">{cap.tag.split('_')[1]}</span>
            </div>
            
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
              className="mb-4 p-3 bg-primary/10 rounded-2xl w-fit border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 transition-colors relative z-10"
            >
              <div className="text-primary group-hover:scale-110 transition-transform duration-300">{cap.icon}</div>
            </motion.div>
            
            <motion.h3 
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: (index * 0.1) + 0.2 }}
              className="text-base font-black uppercase tracking-tight text-white mb-2 group-hover:text-primary transition-colors relative z-10"
            >
              {cap.title}
            </motion.h3>
            
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.8 }}
              transition={{ delay: (index * 0.1) + 0.3 }}
              className="text-[var(--eu-text-muted)] text-[10px] md:text-xs leading-relaxed font-outfit uppercase tracking-widest group-hover:opacity-100 transition-opacity text-justify relative z-10" 
              style={{ textAlignLast: 'left' }}
            >
              {cap.desc}
            </motion.p>
            
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
               <span className="text-[9px] font-mono tracking-widest text-[var(--eu-text-muted)] uppercase italic">status: operational</span>
               <div className="flex items-center gap-1.5">
                  <motion.div 
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--eu-glow)]" 
                  />
                  <span className="text-[7px] font-black text-primary/50 uppercase tracking-tighter">Live</span>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Capabilities;
