import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, Activity, Lock, Cpu, Database, Bug, BarChart } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Globe />,
      title: "Global Node Scan",
      desc: "Distributed crawlers initiate deep-packet inspection across all localized network endpoints.",
      status: "NODE_ACTIVE"
    },
    {
      icon: <Shield />,
      title: "Security Audit",
      desc: "Real-time identification of digital vulnerabilities and compliance with SSL/TLS protocols.",
      status: "AUDIT_READY"
    },
    {
      icon: <Cpu />,
      title: "AI Analysis",
      desc: "Neural processing engines evaluate semantic structure and functional integrity of assets.",
      status: "CORE_ONLINE"
    },
    {
      icon: <Database />,
      title: "Data Integrity",
      desc: "Binary consistency check and cross-reference validation against master data schemas.",
      status: "SYNC_COMPLETE"
    }
  ];

  return (
    <section className="w-full flex flex-col items-center">
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-40 gap-20">
          <div className="w-full">
            <div className="flex items-center gap-6 mb-8">
               <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
               <span className="text-[10px] font-black tracking-industrial text-primary uppercase opacity-60">System Protocol Layer</span>
            </div>
            <h2 className="font-outfit text-5xl md:text-7xl font-black mb-10 flex items-center gap-6 uppercase tracking-tight-mega premium-gradient-text leading-none">
              Protocols
            </h2>
            <p className="text-slate-500 max-w-xl text-[12px] font-black leading-[2] uppercase tracking-[0.25em] opacity-40">
              Multi-layer autonomous validation engine for critical digital infrastructure systems. // Node Integration 0x741
            </p>
          </div>
          <div className="bg-primary/5 border border-primary/20 px-8 py-4 rounded-xl text-primary font-mono text-[10px] tracking-industrial uppercase font-black mb-2 shadow-neon">
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
              className="industrial-card group bg-[#0d0d16]/60 !p-8"
            >
              <div className="relative z-10 h-full flex flex-col items-start text-left">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-10 text-primary border border-primary/20 shadow-neon-strong group-hover:scale-110 transition-transform duration-700">
                  {React.cloneElement(step.icon, { size: 24 })}
                </div>
                <h3 className="font-outfit text-2xl font-black mb-6 uppercase tracking-tight-mega premium-gradient-text leading-none">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-[10px] leading-[2] font-black uppercase tracking-[0.15em] opacity-60 mb-10">
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
