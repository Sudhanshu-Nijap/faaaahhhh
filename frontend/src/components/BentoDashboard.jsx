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
import ChatInterface from './ChatInterface';

const BentoDashboard = ({ onScanStarted, onSelectReport, refreshKey, theme }) => {
  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4 sm:px-0">
      <div className="flex flex-col gap-12">
        
        {/* --- Primary GPT Interface (Hero) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full min-h-[600px] sm:min-h-[700px] flex flex-col"
        >
          <div className="flex items-center gap-4 sm:gap-6 mb-8">
            <div className="h-px w-12 sm:w-16 bg-primary" />
            <span className="text-[10px] sm:text-[12px] font-black tracking-industrial text-primary uppercase opacity-60">Neural Command Interface</span>
          </div>
          
          <div className="flex-1">
             <ChatInterface onScanStarted={onScanStarted} />
          </div>
        </motion.div>

        {/* --- Diagnostic Logs / Archives --- */}
        <motion.div 
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.8 }}
           className="glass-panel rounded-[32px] p-6 sm:p-12 border-[var(--eu-glass-border)] flex flex-col min-h-[500px]"
        >
          <div className="flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="h-px w-12 sm:w-16 bg-primary/40" />
            <span className="text-[10px] sm:text-[12px] font-black tracking-industrial text-primary/60 uppercase">Authenticated Archives</span>
          </div>
          
          <ReportDashboard 
            onSelectReport={onSelectReport} 
            refreshKey={refreshKey}
            isBentoView={true}
            theme={theme}
          />
        </motion.div>

      </div>
    </div>
  );
};

export default BentoDashboard;
