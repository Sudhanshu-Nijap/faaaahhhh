import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReportCard from './ReportCard';
import { Loader2, RefreshCcw, Search, BarChart3, Database, History } from 'lucide-react';

const ReportDashboard = ({ onSelectReport, isBentoView, refreshKey }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.get(`http://localhost:5000/api/reports?userId=${userId}`);
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/report/${id}`);
      setReports(reports.filter(r => r._id !== id));
    } catch (error) {
      console.error('Failed to purge report', error);
      alert('Failed to purge report. Link integrity check may be failing.');
    }
  };

  // Initial fetch and manual refresh
  useEffect(() => {
    fetchReports();
  }, [refreshKey]);

  // Polling for in-progress scans
  useEffect(() => {
    const hasInProgress = reports.some(r => r.status === 'in-progress');
    let interval;
    
    if (hasInProgress) {
      interval = setInterval(() => {
        fetchReports(false); // Fetch without showing global loading spinner
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [reports]);

  const filteredReports = reports.filter(r => 
    new URL(r.url).hostname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`w-full ${isBentoView ? 'h-full flex flex-col' : ''}`}>
      {!isBentoView && (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mb-16">
        <div className="flex flex-col gap-6">
           <div className="flex items-center gap-6">
              <div className="h-px w-12 bg-primary/40" />
              <span className="text-[9px] font-black tracking-industrial text-primary/60 uppercase">Data Repository</span>
           </div>
           <div className="flex items-center gap-4">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight-mega premium-gradient-text">Archives</h2>
              <span className="flex items-center justify-center text-[10px] font-black px-2.5 h-6 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-neon">
                 {reports.length}
              </span>
           </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto pb-2">
          <div className="relative flex-1 md:w-64 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500/50 group-focus-within:text-primary transition-colors" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Domain..."
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-[13px] font-bold tracking-industrial uppercase focus:outline-none focus:border-primary/40 focus:bg-white/[0.07] transition-all"
            />
          </div>
          
          <button 
            onClick={fetchReports}
            className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:border-primary/40 text-slate-500 hover:text-white transition-all active:scale-95"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>
      )}
      
      {/* Dashboard Grid */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 glass-card border-dashed border-white/10">
            <div className="relative flex items-center justify-center mb-8">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-[-30px] border border-dashed border-primary/20 rounded-full" 
               />
               <Loader2 className="animate-spin text-primary" size={60} strokeWidth={1} />
            </div>
            <p className="text-text-muted font-black tracking-[0.4em] uppercase text-[10px] opacity-40 animate-pulse">Requesting Uplink Access...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-32 text-center glass-card border-dashed border-white/10"
          >
            <div className="w-20 h-20 bg-primary/5 rounded-[30px] flex items-center justify-center mx-auto mb-8 border border-primary/5">
              <Database className="text-primary/10" size={36} />
            </div>
            <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">System Index Clear</h3>
            <p className="text-text-muted text-lg max-w-sm mx-auto font-medium opacity-40 leading-relaxed">
              No authenticated diagnostic signatures found in the current localized memory sector.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report) => (
                <ReportCard 
                  key={report._id} 
                  report={report} 
                  onClick={onSelectReport} 
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Decorative Grid Stats Overlay */}
      {!isBentoView && (
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-4 gap-8 opacity-30">
           <StatsPanel label="Cluster Peak" value="98.4%" />
           <StatsPanel label="Neural Load" value="Critical" primary />
           <StatsPanel label="Active Nodes" value="1,024" />
           <StatsPanel label="Uptime" value="100.00.00" />
        </div>
      )}
    </div>
  );
};

const StatsPanel = ({ label, value, primary }) => (
  <div className={`p-6 glass-card flex flex-col items-center gap-1 ${primary ? 'border-primary/30 bg-primary/5' : ''}`}>
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted">{label}</p>
    <p className={`text-xl font-black ${primary ? 'text-primary' : 'text-white'}`}>{value}</p>
  </div>
);

export default ReportDashboard;
