import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Clock, Globe, Shield, Activity, ArrowRight, ChevronRight, AlertCircle, CheckCircle2, Layout, Database } from 'lucide-react';

const ReportCard = ({ report, onClick, onDelete }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-primary';
      case 'failed': return 'text-rose-500';
      case 'in-progress': return 'text-amber-500';
      default: return 'text-text-muted';
    }
  };

  const domain = new URL(report.url).hostname;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Purge all diagnostic data for ${domain}? This action is irreversible.`)) {
      onDelete(report._id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative cursor-pointer h-full"
      onClick={() => onClick && onClick(report._id)}
    >
      {/* Interactive Border Glow */}
      <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-[26px] transition-all duration-500 group-hover:from-primary/40 group-hover:to-secondary/40 group-hover:blur-sm" />
      
      <div className="relative h-full glass-card p-6 flex flex-col gap-6 overflow-hidden">
        {/* Card Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5 min-w-0">
             <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted/40 group-hover:text-primary transition-colors">
                <Globe size={12} />
                <span>Node Endpoint</span>
             </div>
             <h3 className="text-xl font-black tracking-tighter text-white group-hover:premium-gradient-text transition-all truncate">
               {domain}
             </h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDelete}
              className="p-2.5 bg-white/[0.03] rounded-lg border border-white/5 text-text-muted hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-90"
              title="Purge Record"
            >
              <Trash2 size={16} />
            </button>
            <div className={`${getStatusColor(report.status)} p-2.5 bg-white/[0.03] rounded-lg border border-white/5 shadow-inner`}>
               <Shield size={16} className="animate-pulse" />
            </div>
          </div>
        </div>

        {/* Neural Metrics */}
        <div className="grid grid-cols-2 gap-3">
           <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] group-hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-1.5 mb-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                 <AlertCircle size={10} className="text-rose-400" />
                 <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em]">Defects</p>
              </div>
              <p className="text-2xl font-black tracking-tighter text-white">{(report.brokenLinks?.length || 0) + (report.consoleErrors?.length || 0)}</p>
           </div>
           <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] group-hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-1.5 mb-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                 <Database size={10} className="text-primary" />
                 <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em]">Pages</p>
              </div>
              <p className="text-2xl font-black tracking-tighter text-white">{report.pagesCrawled || 0}</p>
           </div>
        </div>

        {/* Status bar */}
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
           <div className="flex flex-col gap-0.5">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-text-muted/30">Last Audit</p>
              <p className="text-[11px] font-bold text-text-muted">{new Date(report.scanDate).toLocaleDateString()}</p>
           </div>
           <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary/40 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-xl">
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportCard;
