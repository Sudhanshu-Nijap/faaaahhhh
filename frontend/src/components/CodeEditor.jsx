import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Eye, RefreshCcw, Save, Zap, AlertTriangle, Bug } from 'lucide-react';

const CodeEditor = ({ file, onAcceptPatch, onRejectPatch }) => {
  const [showFixed, setShowFixed] = useState(true);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
        <Code size={120} className="text-white/5 mb-8 stroke-[0.5]" />
        <h3 className="text-xl font-black uppercase tracking-widest text-primary mb-2">Neural Code Engine</h3>
        <p className="text-[10px] font-black uppercase tracking-industrial">Select artifact for tactical analysis</p>
      </div>
    );
  }

  const codeToShow = showFixed ? (file.updatedCode || file.content) : file.content;
  const lines = codeToShow.split('\n');

  return (
    <div className="flex flex-col h-full bg-black/40 relative">
      <div className="flex items-center justify-between p-6 border-b border-[var(--eu-glass-border)] bg-[var(--eu-bg-void)]">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20 shadow-neon">
            <Zap size={18} className="text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{file.name}</h3>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Confidence: {file.confidence || '100%'}</span>
              <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">Source: {file.source || 'Static'}</span>
            </div>
          </div>
        </div>
        
        {/* Actions Registry Removed in V19 Pruning */}
      </div>

      <div className="flex-1 overflow-auto p-8 font-mono text-[13px] leading-relaxed no-scrollbar relative group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            {file.fixed ? <Zap size={120} /> : <Code size={120} />}
        </div>
        
        <div className="flex gap-10 min-w-max">
          <div className="text-right text-slate-800 font-medium select-none w-10 sticky left-0 font-mono">
            {lines.map((_, i) => (
              <div key={i} className="leading-relaxed h-[20px]">{i + 1}</div>
            ))}
          </div>
          
          <pre className="text-white/80 whitespace-pre relative tracking-tighter">
            {lines.map((line, i) => {
              const isPatched = file.patches?.some(p => p.line === (i + 1));
              return (
                <div 
                  key={i} 
                  className={`leading-relaxed h-[20px] px-4 -mx-4 transition-colors ${
                      isPatched && showFixed ? 'bg-primary/20 text-primary border-r-2 border-primary shadow-[inset_0_0_10px_rgba(var(--eu-accent-rgb),0.1)]' : ''
                  }`}
                >
                  {line || ' '}
                </div>
              );
            })}
          </pre>
        </div>
      </div>

      {file.fallback && (
        <AnimatePresence>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-10 left-10 right-10 p-6 glass-euphoria border border-primary/30 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex items-center gap-4 mb-4">
                    <AlertTriangle className="text-primary animate-pulse" size={20} />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Tactical Fallback Diagnostics</h4>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    {file.fallback.issues.map((issue, idx) => (
                        <div key={idx} className="flex gap-3">
                            <div className="size-4 shrink-0 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-[8px] font-black text-primary">{idx + 1}</div>
                            <p className="text-[10px] text-slate-300 font-medium leading-relaxed italic">"{issue}"</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default CodeEditor;
