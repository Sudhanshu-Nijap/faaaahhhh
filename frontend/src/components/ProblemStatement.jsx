import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Activity, ShieldAlert } from 'lucide-react';

const ProblemStatement = () => {
  const problems = [
    {
      icon: <Clock size={24} />,
      title: "Manual Audit Latency",
      desc: "Static security audits take weeks of manual labor, leaving modern rapid-deployment pipelines exposed for critical windows."
    },
    {
      icon: <AlertTriangle size={24} />,
      title: "Hidden Technical Debt",
      desc: "Standard scanners miss structural architectural flaws and deep-DOM vulnerabilities that evolve with dynamic JS frameworks."
    },
    {
      icon: <ShieldAlert size={24} />,
      title: "Fragmented Operations",
      desc: "Security data is often siloed, lacking the centralized, AI-driven synthesis needed for tactical remediation at scale."
    }
  ];

  return (
    <section id="problem" className="w-full py-24 px-6 md:px-10 relative overflow-hidden bg-white/[0.02]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col mb-16 gap-6">
          <div className="flex items-center gap-6">
            <div className="h-px w-16 bg-primary/50" />
            <span className="text-[12px] font-black tracking-industrial text-primary uppercase">01 // The Critical Gap</span>
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tight-mega premium-gradient-text leading-[0.85]">
            Legacy Security<br />
            <span className="text-primary/80">is Failing.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((prob, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 border-l-2 border-l-primary/30 hover:border-l-primary transition-all group"
            >
              <div className="mb-8 p-4 bg-primary/10 rounded-2xl w-fit text-primary group-hover:scale-110 transition-transform">
                {prob.icon}
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-white mb-4 group-hover:text-primary/80 transition-colors">
                {prob.title}
              </h3>
              <p className="text-[var(--eu-text-muted)] text-xs sm:text-sm leading-relaxed font-outfit uppercase tracking-widest opacity-80">
                {prob.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 p-8 glass-euphoria border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-6">
              <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                 <ShieldAlert className="text-primary" size={24} />
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Risk Factor 0x7E2</p>
                 <p className="text-white font-black text-sm uppercase tracking-tight">Average Cost of Undetected Vulnerability: $4.45M</p>
              </div>
           </div>
           <div className="h-px flex-1 bg-primary/10 hidden md:block mx-8" />
           <p className="text-[var(--eu-text-muted)] font-mono text-[9px] uppercase tracking-widest italic">
              "Traditional scanning methods are no longer sufficient for neural-scale architectures."
           </p>
        </div>
      </div>
    </section>
  );
};

export default ProblemStatement;
