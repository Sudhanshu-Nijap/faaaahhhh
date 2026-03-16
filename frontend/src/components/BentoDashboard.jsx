import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Activity, 
  Zap, 
  Database, 
  Terminal as TerminalIcon, 
  Cpu, 
  Globe, 
  Target, 
  AlertCircle,
  Wifi,
  BarChart3,
  Search
} from 'lucide-react';
import ScanForm from './ScanForm';
import ReportDashboard from './ReportDashboard';

const BentoDashboard = ({ onScanStarted, onSelectReport, refreshKey }) => {
  return (
    <div className="w-full max-w-7xl mx-auto py-10">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
        
        {/* --- Primary Command Card (Large) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 glass-panel rounded-[32px] p-12 relative flex flex-col justify-center overflow-hidden border-primary/20 group min-h-[400px]"
        >
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10 group-hover:bg-primary/20 transition-colors duration-1000" />
          
          <div className="flex items-center gap-6 mb-12">
            <div className="h-px w-16 bg-primary" />
            <span className="text-[12px] font-black tracking-industrial text-primary uppercase opacity-60">Operations Command Center</span>
          </div>
          
          <div className="max-w-3xl">
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tight-mega mb-10 premium-gradient-text">Initialize Infrastructure Scan</h2>
            <ScanForm onScanStarted={onScanStarted} />
          </div>

          <div className="absolute bottom-12 right-12 flex items-center gap-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <Cpu size={28} className="text-primary animate-pulse" />
            <span className="font-mono text-[10px] tracking-widest uppercase">Sentinel_Kernel_v4.2</span>
          </div>
        </motion.div>

        {/* --- Diagnostic Logs / Archives (Full Width) --- */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2, duration: 0.8 }}
           className="lg:col-span-6 glass-panel rounded-[32px] p-12 border-white/5 flex flex-col min-h-[600px]"
        >
          <div className="flex items-center gap-6 mb-12">
            <div className="h-px w-16 bg-primary/40" />
            <span className="text-[12px] font-black tracking-industrial text-primary/60 uppercase">Authenticated Archives</span>
          </div>
          
          <ReportDashboard 
            onSelectReport={onSelectReport} 
            refreshKey={refreshKey}
            isBentoView={true}
          />
        </motion.div>

      </div>
    </div>
  );
};

export default BentoDashboard;
