import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Activity, 
  Zap, 
  Database, 
  Skull, 
  Globe, 
  Target, 
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import axios from 'axios';

const GlobalIntelligence = ({ reports }) => {
  const calculateDynamicHealth = (r) => {
    if (r.healthScore && r.healthScore > 0) return r.healthScore;
    const weights = { network: 0.1, links: 10, console: 5, ui: 10, accessibility: 10 };
    const raw = (r.brokenLinks?.length || 0) * weights.links + 
                (r.consoleErrors?.length || 0) * weights.console + 
                (r.networkLogs?.length || 0) * weights.network + 
                (r.accessibilityIssues?.length || 0) * weights.accessibility +
                (r.uiIssues?.length || 0) * weights.ui;
    return Math.max(1, Math.round(100 * Math.exp(-raw / 400)));
  };

  const stats = React.useMemo(() => {
    if (!reports || reports.length === 0) return null;
    
    // Filter out reports that have no telemetry at all (empty shells)
    const audited = reports.filter(r => 
        (r.brokenLinks?.length || 0) + 
        (r.consoleErrors?.length || 0) + 
        (r.networkLogs?.length || 0) + 
        (r.accessibilityIssues?.length || 0) > 0 || r.status === 'completed'
    );

    if (audited.length === 0) return null;

    // Group by Normalized URL and pick latest per URL
    const latestByUrl = {};
    audited.forEach(r => {
        // Normalize: remove trailing slash, lowercase
        const normUrl = r.url.replace(/\/$/, '').toLowerCase();
        if (!latestByUrl[normUrl] || new Date(r.createdAt) > new Date(latestByUrl[normUrl].createdAt)) {
            latestByUrl[normUrl] = r;
        }
    });
    const uniqueLatest = Object.values(latestByUrl);

    const totalVulnerabilities = uniqueLatest.reduce((acc, r) => {
        return acc + 
            (r.brokenLinks?.length || 0) + 
            (r.consoleErrors?.length || 0) + 
            (r.networkLogs?.length || 0) + 
            (r.accessibilityIssues?.length || 0) +
            (r.uiIssues?.length || 0) +
            (r.formIssues?.length || 0);
    }, 0);
    
    const avgHealth = Math.round(uniqueLatest.reduce((acc, r) => acc + calculateDynamicHealth(r), 0) / uniqueLatest.length);
    const criticalSites = uniqueLatest.filter(r => calculateDynamicHealth(r) < 60).length;
    
    // Sort domains by health
    const domains = uniqueLatest.map(r => {
        let host = 'Unknown Host';
        try { host = new URL(r.url).hostname; } catch(e) {}
        const score = calculateDynamicHealth(r);
        return {
            host,
            score,
            id: r._id
        };
    }).sort((a, b) => a.score - b.score);

    const totalBytes = audited.reduce((acc, r) => acc + (r.performanceMetrics?.pageSize || 0), 0);
    const dataLatticeMB = totalBytes / (1024 * 1024);
    const dataLatticeValue = dataLatticeMB >= 1024 ? `${(dataLatticeMB / 1024).toFixed(2)} GB` : `${dataLatticeMB.toFixed(1)} MB`;

    const stabilityCoefficient = (avgHealth / 100).toFixed(2);
    
    // Uptime: ratio of non-failed to total reports
    const nonFailed = reports.filter(r => r.status !== 'failed');
    const uptimeValue = reports.length > 0 ? `${((nonFailed.length / reports.length) * 100).toFixed(1)}%` : '100%';

    return {
        totalVulnerabilities,
        criticalSites,
        domains, // Now shows all unique nodes
        activeNodes: uniqueLatest.length,
        dataLatticeValue,
        stabilityCoefficient,
        uptimeValue
    };
  }, [reports]);

  if (!stats) return (
    <div className="h-[600px] flex items-center justify-center glass-euphoria rounded-[40px] border-white/5 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Neural Aggregator Initializing...</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-16">
        <div className="space-y-4">
           <div className="flex items-center gap-6">
              <div className="h-px w-12 bg-eu-accent/40" />
              <span className="text-[10px] font-black tracking-industrial text-primary uppercase opacity-50">Aggregate Intelligence</span>
           </div>
           <h2 className="text-5xl sm:text-7xl font-black uppercase tracking-tight-mega premium-gradient-text font-outfit">Cortex <span className="text-white italic">Wide</span></h2>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="px-6 py-4 glass-euphoria rounded-3xl border-white/5 flex flex-col items-center">
              <span className="text-[8px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest mb-1 text-center">Neural_Nodes</span>
              <span className="text-2xl font-black text-white font-outfit">{stats.activeNodes}</span>
           </div>
           <div className="px-6 py-4 bg-primary/10 rounded-3xl border border-primary/20 shadow-neon flex flex-col items-center">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest mb-1 text-center">Avg_Immunity</span>
              <span className="text-2xl font-black text-white font-outfit">{stats.avgHealth}%</span>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <IntelligenceCard 
           label="System_Threats" 
           value={stats.totalVulnerabilities} 
           icon={<Skull className="text-primary" />} 
           trend="Active" 
           color="primary"
         />
         <IntelligenceCard 
           label="Breach_Surface" 
           value={stats.criticalSites} 
           icon={<Target className="text-primary" />} 
           trend="High Risk" 
           color="primary"
         />
         <IntelligenceCard 
           label="Neural_Uptime" 
           value={stats.uptimeValue} 
           icon={<Activity className="text-primary" />} 
           trend="Stable" 
           color="primary"
         />
         <IntelligenceCard 
           label="Data_Lattice" 
           value={stats.dataLatticeValue} 
           icon={<Database className="text-primary" />} 
           trend="Synced" 
           color="violet"
         />
      </div>

      {/* Domain Risk Heatmap/List */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         <div className="xl:col-span-2 glass-euphoria p-10 rounded-[40px] border border-white/5 space-y-8">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
               <div className="flex items-center gap-4">
                  <ShieldAlert className="text-primary" size={20} />
                  <h3 className="text-xl font-black uppercase tracking-tight font-outfit text-white text-base">Critical <span className="text-primary italic">Vulnerabilities</span></h3>
               </div>
               <span className="text-[8px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest">Priority_Sort</span>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-tactical">
               {stats.domains.map((d, i) => (
                  <motion.div 
                    key={d.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-white/[0.02] hover:bg-white/[0.05] p-6 rounded-3xl border border-white/5 flex items-center justify-between transition-all"
                  >
                     <div className="flex items-center gap-6">
                        <div className={`size-12 shrink-0 rounded-2xl flex items-center justify-center border font-black text-xs ${d.score < 60 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                           {d.score}%
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="text-[12px] font-black text-white uppercase tracking-tight truncate">{d.host}</p>
                           <p className="text-[8px] font-mono text-[var(--eu-text-muted)] uppercase tracking-widest mt-1 italic group-hover:text-primary transition-colors truncate">
                               {d.score < 60 ? 'Immediate Remediation Required' : 'Node Operating Optimally'}
                           </p>
                        </div>
                     </div>

                  </motion.div>
               ))}
            </div>
         </div>

         <div className="glass-euphoria p-10 rounded-[40px] border border-white/5 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10">
               <Activity size={120} className="text-primary" />
            </div>
            <div className="flex items-center gap-4 border-b border-white/5 pb-8 relative z-10">
               <ShieldCheck className="text-primary" size={20} />
               <h3 className="text-xl font-black uppercase tracking-tight font-outfit text-white text-base">Global <span className="text-primary italic">Immunity</span></h3>
            </div>
            
            <div className="space-y-10 relative z-10">
               <div className="p-8 bg-primary/5 border border-primary/10 rounded-[32px] text-center">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">Stability_Coefficient</span>
                  <span className="text-6xl font-black text-white font-outfit italic tracking-tighter">{stats.stabilityCoefficient}</span>
               </div>
               
               <div className="space-y-6">
                  <p className="text-[10px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest">Neural_Activity_Summary</p>
                  <p className="text-sm text-[var(--eu-text-muted)] font-medium italic leading-relaxed">
                     System-wide telemetry has analyzed {stats.totalVulnerabilities} total threats across {stats.activeNodes} neural nodes. Current stability indicates an operational immunity index of {stats.avgHealth}%. {stats.criticalSites > 0 ? `${stats.criticalSites} sectors require immediate remediation.` : 'All pathways stabilized.'}
                  </p>
               </div>
               
               <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest">Cortex_Health</span>
                     <span className="text-sm font-black text-white uppercase tracking-tight">Optimized</span>
                  </div>
                  <div className="flex items-center gap-1 group">
                     {[1,2,3,4,5,6,7,8].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [12, 24, 12] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                          className="w-1 bg-primary/40 rounded-full group-hover:bg-primary transition-colors"
                        />
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const IntelligenceCard = ({ label, value, icon, trend, color }) => {
  const colors = {
    rose: 'text-primary shadow-primary/20',
    amber: 'text-primary shadow-primary/20',
    emerald: 'text-primary shadow-primary/20',
    violet: 'text-primary shadow-primary/20',
  };
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass-euphoria p-8 rounded-[32px] border border-white/5 relative group overflow-hidden shadow-xl"
    >
      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
         {React.cloneElement(icon, { size: 100 })}
      </div>
      <div className="flex items-center justify-between mb-8">
         <div className={`size-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center transition-all group-hover:border-white/20 shadow-inner`}>
            {React.cloneElement(icon, { size: 18 })}
         </div>
         <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 border border-white/10 ${colors[color]}`}>
            {trend}
         </span>
      </div>
      <div className="flex flex-col">
         <span className="text-[10px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest mb-1">{label}</span>
         <span className="text-3xl font-black text-white font-outfit uppercase tracking-tighter">{value}</span>
      </div>
    </motion.div>
  );
};

export default GlobalIntelligence;
