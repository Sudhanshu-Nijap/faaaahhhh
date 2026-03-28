import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  Trash2, 
  Clock, 
  Globe, 
  Shield, 
  Activity, 
  ArrowRight, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Layout, 
  Database, 
  MoreVertical, 
  BarChart3, 
  Share2, 
  Pin,
  UserPlus,
  Edit2,
  Archive,
  Share,
  Plus
} from 'lucide-react';

const MenuButton = ({ icon, label, onClick, danger, active }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11px] font-medium transition-all ${
      danger ? 'text-primary opacity-80 hover:bg-primary/10' : 
      'text-[var(--eu-text-main)]/60 hover:bg-[var(--eu-hover-bg)]'
    }`}
  >
    <span className={`transition-colors ${danger ? 'text-primary' : 'text-[var(--eu-text-main)]/40'}`}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
  </button>
);

const ReportCard = ({ report, onClick, onDelete, onPin, onShare, onRename, onArchive, onGroupChart, onOpenMenu, isMenuOpen, confirm, prompt, setAlert }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-eu-status-pass';
      case 'failed': return 'text-eu-status-fail';
      case 'in-progress': return 'text-eu-status-warn';
      default: return 'text-eu-text-muted';
    }
  };

  const domain = new URL(report.url).hostname;

  const handleDelete = async (e) => {
    e.stopPropagation();
    const confirmed = await confirm({
        title: "Node Purge Protocol",
        message: `Permanently decommission diagnostic data for ${domain}? This sector will be wiped.`,
        confirmText: "Decommission",
        type: "danger"
    });
    if (confirmed) {
      onDelete(report._id);
      if (setAlert) setAlert({ type: 'success', message: `Uplink to ${domain} severed.` });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -10, scale: 1.02 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group relative cursor-pointer h-full"
      onClick={() => onClick && onClick(report._id)}
    >
      <div className="relative h-full bg-white dark:bg-black border border-[var(--eu-glass-border)] p-8 flex flex-col gap-8 overflow-hidden rounded-[36px] shadow-2xl transition-all duration-700">
        {/* Decorative Background Blob */}
        <div className="absolute top-[-20%] right-[-20%] size-32 bg-eu-accent/5 blur-3xl rounded-full transition-all duration-700" />

        {/* Card Header */   }
        <div className="flex justify-between items-start gap-5">
          <div className="space-y-2 min-w-0">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--eu-text-main)] opacity-40 group-hover:text-eu-accent transition-colors">
                <Globe size={14} />
                <span>Diagnostic Node</span>
             </div>
             <h3 className="text-2xl font-black tracking-tight-mega text-white group-hover:premium-gradient-text transition-all truncate font-outfit">
               {domain}
             </h3>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const rect = e.currentTarget.getBoundingClientRect();
                  onOpenMenu(report._id, { top: rect.top, left: rect.right + 12 });
                }}
                className={`p-3 rounded-2xl border transition-all active:scale-90 ${isMenuOpen ? 'bg-eu-accent border-eu-accent text-white shadow-neon' : 'bg-[var(--eu-bg-void)] border-[var(--eu-glass-border)] text-eu-text-muted hover:text-white hover:border-white/20'}`}
              >
                <MoreVertical size={18} />
              </button>

            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onPin(report._id); }}
              className={`p-3 rounded-2xl border transition-all active:scale-90 relative ${report.isPinned ? 'bg-eu-accent border-eu-accent text-white shadow-neon' : 'bg-[var(--eu-bg-void)] border-[var(--eu-glass-border)] text-eu-text-muted hover:text-eu-accent hover:border-eu-accent/30'}`}
              title={report.isPinned ? "Unpin intelligence" : "Pin intelligence"}
            >
               <Pin size={18} className={report.isPinned ? 'fill-current' : ''} />
            </button>

            <div className={`${getStatusColor(report.status)} p-3 bg-[var(--eu-bg-void)] rounded-2xl border border-[var(--eu-glass-border)] shadow-neon relative`}>
               <Shield size={18} className={report.status === 'in-progress' ? 'animate-spin' : 'animate-pulse'} />
            </div>
          </div>
        </div>

        {/* Neural Metrics */}
        <div className="grid grid-cols-2 gap-4">
           <div className="p-4 bg-[var(--eu-bg-void)] rounded-2xl border border-[var(--eu-glass-border)] group-hover:border-eu-accent/20 transition-colors">
              <div className="flex items-center gap-2 mb-2 opacity-40 group-hover:opacity-100 transition-opacity">
                 <AlertCircle size={12} className="text-primary" />
                 <p className="text-[9px] font-black text-[var(--eu-text-main)] opacity-40 uppercase tracking-[0.2em]">Defects</p>
              </div>
              <p className="text-3xl font-black tracking-tighter text-white">
                {(report.brokenLinks?.length || 0) + 
                 (report.consoleErrors?.length || 0) + 
                 (report.formIssues?.length || 0) + 
                 (report.uiIssues?.length || 0) + 
                 (report.accessibilityIssues?.length || 0)}
              </p>
           </div>
           <div className="p-4 bg-[var(--eu-bg-void)] rounded-2xl border border-[var(--eu-glass-border)] group-hover:border-eu-accent/20 transition-colors">
              <div className="flex items-center gap-2 mb-2 opacity-40 group-hover:opacity-100 transition-opacity">
                 <Database size={12} className="text-eu-accent" />
                 <p className="text-[9px] font-black text-[var(--eu-text-main)] opacity-40 uppercase tracking-[0.2em]">Pages</p>
              </div>
              <p className="text-3xl font-black tracking-tighter text-white">{report.pagesCrawled || 0}</p>
           </div>
        </div>

        {/* Status bar */}
        <div className="mt-auto pt-6 border-t border-[var(--eu-glass-border)] flex items-center justify-between">
           <div className="flex flex-col gap-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--eu-text-main)] opacity-40">Sync_Timestamp</p>
              <p className="text-[12px] font-black text-[var(--eu-text-main)] opacity-40">{new Date(report.scanDate).toLocaleDateString()}</p>
           </div>
           <div className="size-10 rounded-2xl bg-[var(--eu-bg-void)] flex items-center justify-center text-eu-accent/40 group-hover:bg-eu-accent group-hover:text-white transition-all duration-700 shadow-neon">
              <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportCard;
