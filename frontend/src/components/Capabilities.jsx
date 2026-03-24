import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Cpu, 
  Lock, 
  Search, 
  Terminal, 
  Activity, 
  Zap, 
  Globe,
  Database,
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
    title: "Gemini 2.5 Analysis",
    desc: "Advanced AI reasoning categorizes findings into risk-stratified architectural reports.",
    tag: "AI_GEMINI"
  },
  {
    icon: <Lock size={22} />,
    title: "Secure Authentication",
    desc: "JWT-protected access ensures your diagnostic data remains within your operational perimeter.",
    tag: "AUTH_PROT"
  },
  {
    icon: <Database size={22} />,
    title: "Diagnostic Archives",
    desc: "Persistent storage of all historical scans for longitudinal security tracking.",
    tag: "DB_STORE"
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
      <div className="flex flex-col mb-8 sm:mb-10 gap-4 px-4 sm:px-0">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight-mega premium-gradient-text leading-tight sm:leading-none">
          Industrial Grade<br className="hidden sm:block" />Security Operations
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CAPABILITIES.map((cap, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel p-8 rounded-3xl border border-white/5 hover:border-primary/30 transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <span className="font-mono text-[40px] font-black italic">{cap.tag.split('_')[1]}</span>
            </div>
            
            <div className="mb-6 p-4 bg-primary/10 rounded-2xl w-fit border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <div className="text-primary">{cap.icon}</div>
            </div>
            
            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-3 group-hover:text-primary transition-colors">
              {cap.title}
            </h3>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-outfit uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity text-justify" style={{ textAlignLast: 'left' }}>
              {cap.desc}
            </p>
            
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
               <span className="text-[9px] font-mono tracking-widest text-slate-600 uppercase italic">status: operational</span>
               <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Capabilities;
