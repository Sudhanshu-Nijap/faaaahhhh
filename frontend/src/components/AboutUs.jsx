import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Activity, RefreshCw } from 'lucide-react';

const AboutUs = () => {

  return (
    <section className="w-full flex flex-col items-center">
      <div className="max-w-6xl w-full mx-auto flex flex-col md:flex-row gap-40">
        <div className="w-full md:w-5/12 py-24">
          <div className="flex items-center gap-6 mb-12">
             <div className="h-px w-16 bg-primary" />
             <span className="text-[10px] font-black tracking-industrial text-primary uppercase opacity-60">Security Framework</span>
          </div>
          <motion.h2 
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-outfit text-5xl md:text-6xl font-black mb-12 leading-tight premium-gradient-text uppercase py-2"
          >
            Technical<br/>Specifications
          </motion.h2>
          <div className="grid grid-cols-1 gap-12">
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
              <div key={i} className="flex flex-col gap-3">
                <span className="text-primary font-black text-[10px] tracking-industrial uppercase opacity-80">{spec.title}</span>
                <p className="text-slate-400 font-outfit text-xs md:text-sm uppercase tracking-widest leading-relaxed">
                  {spec.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </section>
  );
};

export default AboutUs;
