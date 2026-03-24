import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ExternalLink, AlertTriangle, Terminal, Layout,
  FormInput, Image, Zap, Smartphone, UserCheck, Loader2,
  CheckCircle2, Info, AlertCircle, BarChart3, Database, Shield, Cpu,
  Wifi, Trash2, Skull, Code, Copy, Check, Plus, Github as GitHubIcon
} from 'lucide-react';
import axios from 'axios';

const StatCard = ({ label, value, color, icon }) => (
  <div className="glass-euphoria p-4 rounded-2xl border-white/5 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all duration-700 group-hover:scale-110">{icon}</div>
    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className={`text-2xl font-black ${color} tracking-tight font-outfit`}>{value}</p>
  </div>
);

const SectionHeader = ({ title, icon }) => (
  <div className="flex items-center gap-4 mb-6">
    <div className="size-10 bg-eu-accent/20 rounded-xl flex items-center justify-center border border-eu-accent/20 shadow-neon text-eu-accent">{icon}</div>
    <h3 className="text-xl font-black uppercase tracking-tight font-outfit text-white">{title} <span className="text-eu-accent italic">Analysis</span></h3>
  </div>
);

const RecommendationCard = ({ title, status, icon, description, statusColor }) => (
  <div className="glass-euphoria p-5 rounded-2xl border-white/5 group hover:border-eu-accent/30 transition-all duration-700 hover:translate-y-[-4px]">
    <div className="flex items-start justify-between mb-6">
      <div className="size-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-eu-accent/20 group-hover:text-eu-accent transition-all duration-700 shadow-inner group-hover:shadow-neon">{icon}</div>
      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusColor} shadow-neon`}>{status}</span>
    </div>
    <h4 className="text-lg font-black text-white mb-2 uppercase tracking-tight font-outfit">{title}</h4>
    <p className="text-slate-400 text-xs leading-relaxed font-medium opacity-80">{description}</p>
  </div>
);

const LighthouseCircle = ({ label, score }) => {
  const getScoreColor = (s) => {
    if (s >= 90) return 'text-eu-accent stroke-eu-accent';
    if (s >= 50) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-4 group">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_10px_rgba(var(--eu-accent-rgb),0.3)]">
          <circle cx="50%" cy="50%" r={radius} fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/5" />
          <circle 
            cx="50%" cy="50%" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
            className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black font-outfit tracking-tight ${getScoreColor(score).split(' ')[0]}`}>{Math.round(score)}</span>
        </div>
      </div>
      <div className="text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors">{label}</span>
      </div>
    </div>
  );
};

const getTabData = (report, tab) => {
  switch (tab) {
    case 'network': return report.networkLogs;
    case 'links': return report.brokenLinks;
    case 'console': return report.consoleErrors;
    case 'layout': return [...(report.uiIssues || []), ...(report.responsiveIssues || [])];
    case 'accessibility': return report.accessibilityIssues;
    case 'chaos': return report.chaosSubmissions;
    case 'smartformtests': return report.smartFormTests;
    default: return [];
  }
};

const getTableColumns = (tab) => {
  switch (tab) {
    case 'network': return ['Method', 'Status', 'Time', 'Url'];
    case 'links': return ['Page', 'Link', 'Status'];
    case 'console': return ['Page', 'Message', 'Type'];
    case 'layout': return ['Page', 'Device', 'Issue', 'Selector'];
    case 'accessibility': return ['Page', 'Issue', 'Severity', 'Element'];
    case 'chaos': return ['Page', 'FormSelector', 'Payload', 'Outcome', 'RiskLevel'];
    default: return [];
  }
};

const IssueTable = ({ data, columns, setRemediationCode }) => {
  const [expandedRowId, setExpandedRowId] = useState(null);

  if (!data || data.length === 0) return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20"><CheckCircle2 className="text-green-500" size={32} /></div>
      <h3 className="text-xl font-bold text-white mb-2">No Anomalies Detected</h3>
      <p className="text-text-muted text-sm max-w-xs mx-auto">This protocol has returned zero active failures for the selected target parameters.</p>
    </div>
  );

  const getRemediationInfo = (row) => {
    // Logic to provide meaningful remediation text based on issue type
    if (row.method) return { // Network
      cause: "High latency or structural fetch failure detected in network cluster.",
      impact: "Degraded page load performance and potential data synchronization loss.",
      guide: `Verify endpoint ${row.url} is optimized for global distribution. Check for redundant header payloads.`
    };
    if (row.type === 'error' || row.message) return { // Console
      cause: "Runtime exception identified in the neural execution environment.",
      impact: "Potential catastrophic failure of interactive UI components.",
      guide: "Inspect call stack for unhandled promises or null-reference collisions in the source bundle."
    };
    if (row.severity) return { // A11y
      cause: "Structural non-compliance with global accessibility protocols.",
      impact: "Exclusion of users with assistive technological requirements.",
      guide: "Ensure ARIA landmarks and semantic contrasts meet WCAG 2.1 premium standards."
    };
    return {
      cause: "General deviation from optimized architectural standards.",
      impact: "Sub-optimal user experience and neural processing inefficiency.",
      guide: "Audit target element's parent hierarchy for redundant styles or layout shifts."
    };
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr>
            {columns.map(col => <th key={col} className="pb-3 px-4 text-[8px] font-black text-slate-500 uppercase tracking-widest">{col}</th>)}
            {!columns.includes('Outcome') && <th className="pb-3 px-4 text-[8px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const rowId = i;
            const isExpanded = expandedRowId === rowId;
            const remediation = getRemediationInfo(row);

            return (
              <React.Fragment key={i}>
                <tr 
                  onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                  className={`group cursor-pointer transition-all duration-500 ${isExpanded ? 'bg-eu-accent/5 translate-x-1' : 'hover:translate-x-2'}`}
                >
                  {columns.map(col => {
                    const columnToKey = { 'Form Selector': 'formSelector', 'Scan Date': 'scanDate', 'Fix Guide': 'recommendation' };
                    const key = columnToKey[col] || col.toLowerCase().replace(/\s/g, '');
                    let value = row[key];

                    if (col === 'Status') {
                      const isCrit = parseInt(value) >= 400 || value === 'Error';
                      return (
                        <td key={col} className="py-3 px-4 glass-euphoria first:rounded-l-xl last:rounded-r-xl border-y border-white/5 first:border-l last:border-r">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black shadow-neon ${isCrit ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-eu-accent/10 text-eu-accent border border-eu-accent/20'}`}>{value || '---'}</span>
                        </td>
                      );
                    }

                    if (col === 'RiskLevel' || col === 'Outcome') {
                      const isSecure = value === 'Secure' || value === 'System Resilience';
                      return (
                        <td key={col} className="py-3 px-4 glass-euphoria first:rounded-l-xl last:rounded-r-xl border-y border-white/5 first:border-l last:border-r">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase shadow-neon ${isSecure ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{value}</span>
                        </td>
                      );
                    }

                    if (col === 'Payload' || col === 'FormSelector' || col === 'Element' || col === 'Selector' || col === 'Message') {
                      return (
                        <td key={col} className="py-3 px-4 glass-euphoria first:rounded-l-xl last:rounded-r-xl border-y border-white/5 first:border-l last:border-r max-w-sm">
                          <code className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-eu-accent/80 border border-white/5 block break-all font-mono shadow-inner">{value || 'NULL'}</code>
                        </td>
                      );
                    }

                    return (
                      <td key={col} className="py-3 px-4 glass-euphoria first:rounded-l-xl last:rounded-r-xl border-y border-white/5 first:border-l last:border-r">
                        <span className="text-[11px] font-bold text-slate-300 block max-w-xs break-all leading-relaxed font-outfit">{value || '---'}</span>
                      </td>
                    );
                  })}
                  {!columns.includes('Outcome') && (
                    <td className="py-3 px-4 glass-euphoria first:rounded-l-xl last:rounded-r-xl border-y border-white/5 first:border-l last:border-r text-right">
                      <div className="flex items-center justify-end gap-3">
                        {row.suggestedFix && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setRemediationCode(row.suggestedFix); }} 
                            className="px-3 py-1.5 bg-eu-accent/10 hover:bg-eu-accent text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-eu-accent/30 transition-all flex items-center gap-2 shadow-neon"
                          >
                            <Code size={12} /> Patch
                          </button>
                        )}
                        <Plus size={14} className={`text-slate-600 transition-transform duration-500 ${isExpanded ? 'rotate-45 text-eu-accent' : ''}`} />
                      </div>
                    </td>
                  )}
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={(columns.length || 0) + 1} className="py-0 px-4">
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="overflow-hidden"
                      >
                        <div className="mb-4 mt-2 p-8 glass-euphoria rounded-[32px] border border-eu-accent/20 bg-eu-accent/5 flex flex-col md:flex-row gap-8 shadow-2xl relative">
                          <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Zap size={64} className="text-eu-accent" />
                          </div>
                          
                          <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-3">
                              <div className="size-8 bg-eu-accent/20 rounded-lg flex items-center justify-center text-eu-accent border border-eu-accent/20">
                                <Shield size={14} />
                              </div>
                              <h4 className="text-sm font-black uppercase tracking-widest text-white">Neural Debug Guide</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Root Cause</p>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed italic">"{remediation.cause}"</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">Security / UX Impact</p>
                                <p className="text-xs text-slate-300 font-medium leading-relaxed italic">"{remediation.impact}"</p>
                              </div>
                            </div>

                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-eu-accent mb-2">Remediation Intelligence</p>
                              <p className="text-xs text-slate-400 font-medium leading-relaxed">{remediation.guide}</p>
                            </div>
                          </div>

                          <div className="w-full md:w-64 space-y-4">
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-3 text-center">Protocol Actions</p>
                              <div className="space-y-2">
                                <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all">Export Log</button>
                                <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all">Neural Trace</button>
                                {row.suggestedFix && (
                                  <button 
                                    onClick={() => setRemediationCode(row.suggestedFix)}
                                    className="w-full py-2.5 bg-eu-accent/20 hover:bg-eu-accent text-white border border-eu-accent/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-neon"
                                  >
                                    Apply Patch
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ReportDetail = ({ reportId, onBack }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [remediationCode, setRemediationCode] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let intervalId = null;

    const fetchReport = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/report/${reportId}`);
        const data = response.data;
        setReport(data);

        // If scan is done, stop polling
        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalId) clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Failed to fetch report', error);
        if (intervalId) clearInterval(intervalId);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchReport();

    // Poll every 4 seconds (will auto-stop once status is 'completed' or 'failed')
    intervalId = setInterval(fetchReport, 4000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [reportId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
      <Loader2 className="animate-spin text-primary mb-6" size={48} />
      <p className="text-text-muted font-bold tracking-widest uppercase text-xs">Decrypting scan protocols...</p>
    </div>
  );

  if (!report) return (
    <div className="glass p-20 text-center rounded-[32px]">
      <AlertTriangle className="text-red-400 mx-auto mb-6" size={48} />
      <h3 className="text-2xl font-bold mb-2">Protocol Failure</h3>
      <p className="text-text-muted">The requested inspection log does not exist or has been purged from the index.</p>
      <button onClick={onBack} className="mt-8 text-primary font-bold flex items-center gap-2 mx-auto">
        <ChevronLeft size={18} /> Return to Dashboard
      </button>
    </div>
  );

  const tabs = [
    { id: 'summary', label: 'Summary', icon: <Zap size={14} /> },
    { id: 'network', label: 'Net', icon: <Wifi size={14} />, count: report.networkLogs?.length || 0 },
    { id: 'links', label: 'Links', icon: <ExternalLink size={14} />, count: report.brokenLinks?.length || 0 },
    { id: 'console', label: 'Console', icon: <Terminal size={14} />, count: report.consoleErrors?.length || 0 },
    { id: 'layout', label: 'UI/UX', icon: <Layout size={14} />, count: (report.uiIssues?.length || 0) + (report.responsiveIssues?.length || 0) },
    { id: 'smartformtests', label: 'Forms', icon: <CheckCircle2 size={14} />, count: report.smartFormTests?.length || 0 },
    { id: 'accessibility', label: 'A11y', icon: <UserCheck size={14} />, count: report.accessibilityIssues?.length || 0 },
    { id: 'chaos', label: 'Chaos', icon: <Skull size={14} />, count: report.chaosSubmissions?.length || 0 },
    { id: 'screenshots', label: 'Screens', icon: <Image size={14} />, count: report.screenshots?.length || 0 },
  ];

  const calculateHealth = () => {
    if (!report) return 100;
    const weights = {
      network: 0.5,
      links: 10,
      console: 2,
      layout: 5,
      accessibility: 15,
    };
    const deductions = tabs.reduce((acc, curr) => {
      const weight = weights[curr.id] || 0;
      return acc + (curr.count * weight);
    }, 0);
    return Math.max(0, Math.round(100 - deductions));
  };

  const healthScore = calculateHealth();

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="size-16 glass-euphoria rounded-3xl hover:border-eu-accent/50 transition-all text-slate-500 hover:text-white group shadow-neon flex items-center justify-center">
            <ChevronLeft size={28} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <h2 className="text-base sm:text-lg md:text-xl font-black premium-gradient-text tracking-[0.2em] uppercase leading-none break-all font-outfit">{new URL(report.url).hostname}</h2>
              <span className={`px-5 py-2 rounded-2xl text-[10px] sm:text-[12px] font-black uppercase tracking-[0.3em] border ${report.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'} shadow-neon`}>
                {report.status}
              </span>
            </div>
            <div className="mt-4 flex flex-row items-center gap-4 opacity-50">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                <Database size={10} className="text-eu-accent" /> LOG_{report._id.toString().slice(-8).toUpperCase()}
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                <span className="opacity-30">//</span> SYNC_{new Date(report.createdAt).toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 no-scrollbar px-1">
          {/* Action Hub (Single Line) */}
          <button 
            onClick={async () => {
              if (window.confirm("Purge this diagnostic log?")) {
                try { await axios.delete(`http://localhost:5000/api/report/${reportId}`); onBack(); } 
                catch (e) { alert("Purge failed."); }
              }
            }}
            className="flex-none flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-500 transition-all shadow-neon"
          >
            Delete <Trash2 size={10} />
          </button>

          <button 
            onClick={async () => {
              try {
                const res = await axios.get(`http://localhost:5000/api/report/${reportId}/export`);
                if (res.data.url) window.open(`http://localhost:5000${res.data.url}`, '_blank');
              } catch (e) { alert("Download failed."); }
            }}
            className="flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-neon text-white"
          >
            PDF <BarChart3 size={10} />
          </button>

          <button 
            onClick={async () => {
              const url = window.prompt("Enter Discord Webhook URL:");
              if (url) {
                try {
                  await axios.post('http://localhost:5000/api/notify/notify', { reportId, type: 'discord', webhookUrl: url });
                  alert("Discord Pulse Dispatched.");
                } catch (e) { alert("Dispatch Failed."); }
              }
            }}
            className="flex-none flex items-center justify-center gap-2 bg-[#5865F2]/10 hover:bg-[#5865F2] hover:text-white border border-[#5865F2]/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#5865F2] transition-all shadow-neon"
          >
            Pulse <Terminal size={10} />
          </button>

          <a 
            href={report.url} target="_blank" rel="noreferrer" 
            className="flex-none flex items-center justify-center gap-2 bg-eu-accent hover:scale-[1.05] active:scale-[0.98] px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-neon text-white"
          >
            Access <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all duration-700 group relative border shadow-lg ${
              activeTab === tab.id ? 'bg-eu-accent/20 border-eu-accent/40 ring-1 ring-eu-accent/20' : 'bg-white/2 border-white/5 hover:border-white/10 hover:bg-white/5'
            }`}
          >
            <div className={`size-9 rounded-xl flex items-center justify-center transition-all duration-700 ${activeTab === tab.id ? 'bg-eu-accent text-white scale-105 shadow-neon' : 'bg-white/5 text-slate-500 group-hover:text-white group-hover:scale-105'}`}>
              {tab.icon}
            </div>
            <div className="text-center">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === tab.id ? 'text-white' : 'text-slate-500'}`}>
                {tab.label}
              </p>
              {tab.count !== undefined && (
                <span className={`text-[11px] font-black font-mono transition-colors ${activeTab === tab.id ? 'text-white/80' : tab.count > 0 ? 'text-eu-accent' : 'text-emerald-500'}`}>
                  {tab.count < 10 && tab.count > 0 ? `0${tab.count}` : tab.count === 0 ? '00' : tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-12">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-16">

              {/* ── Scan In Progress Banner ── */}
              {report.status !== 'completed' && (
                <motion.div animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} className="flex items-center gap-6 p-8 rounded-[32px] border border-eu-accent/30 bg-eu-accent/5 shadow-neon">
                  <Loader2 size={28} className="text-eu-accent animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-[0.2em] font-outfit">Active Neural Crawl</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Sentinel AI is navigating the DOM tree and harvesting diagnostic signatures. Data will stream in real-time.</p>
                  </div>
                  <div className="ml-auto px-4 py-1.5 rounded-xl bg-eu-accent/20 border border-eu-accent/20 text-[10px] font-black text-eu-accent uppercase tracking-widest animate-pulse font-outfit">Status: {report.status}</div>
                </motion.div>
              )}

              {/* ── Neural Analysis Hub (AI Insights) ── */}
              {report.aiInsights ? (
                <div className="relative group overflow-hidden rounded-[48px]">
                  <div className="absolute inset-0 bg-gradient-to-br from-eu-accent/20 via-transparent to-transparent opacity-50" />
                  <div className="relative glass-euphoria p-12 md:p-20 rounded-[48px] border-white/10">
                    <div className="flex flex-col md:flex-row gap-12 items-start md:items-center mb-16">
                      <div className="relative shrink-0 p-10 bg-slate-950 border border-eu-accent/30 rounded-[40px] shadow-neon">
                        <Cpu size={72} className="text-eu-accent animate-pulse" />
                      </div>
                      <div className="flex-1 space-y-5">
                        <div className="flex flex-wrap items-center gap-5">
                          <div className="px-3 py-1.5 bg-eu-accent text-[10px] font-black uppercase tracking-[0.3em] rounded-xl shadow-neon text-white font-outfit">Cognitive Report</div>
                          <div className="px-3 py-1.5 bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] rounded-xl text-slate-500 font-outfit">{report.url}</div>
                        </div>
                        <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white leading-[1.1] font-outfit">
                          {report.aiInsights.classification || 'Neutral State Detected'}
                        </h3>
                        <p className="text-slate-300 text-xl md:text-2xl leading-relaxed font-medium font-outfit opacity-90 italic">
                          "{report.aiInsights.summary || 'Scan data is being synthesized into narrative insights...'}"
                        </p>
                      </div>
                    </div>

                    {/* Issue Cards */}
                    {report.aiInsights.issues?.length > 0 ? (
                      <div className="space-y-8">
                        <div className="text-[12px] font-black text-eu-accent uppercase tracking-[0.4em] flex items-center gap-4 pb-4 border-b border-white/5 font-outfit">
                          <AlertTriangle size={16} /> {report.aiInsights.issues.length} Critical Deviations Found
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          {report.aiInsights.issues.map((issue, idx) => {
                            const sc = issue.severity === 'Critical' ? 'border-rose-500/40 bg-rose-500/5' : issue.severity === 'High' ? 'border-amber-500/40 bg-amber-500/5' : issue.severity === 'Medium' ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-emerald-500/40 bg-emerald-500/5';
                            const sb = issue.severity === 'Critical' ? 'bg-rose-500 text-white' : issue.severity === 'High' ? 'bg-amber-500 text-white' : issue.severity === 'Medium' ? 'bg-yellow-500 text-black' : 'bg-emerald-500 text-black';
                            return (
                              <div key={idx} className={`border rounded-[32px] p-8 md:p-10 space-y-8 transition-all hover:translate-x-2 duration-500 ${sc}`}>
                                <div className="flex flex-wrap items-center gap-4">
                                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${sb} shadow-neon`}>{issue.severity}</span>
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-white/10 text-slate-300 border border-white/10 font-outfit">ETA: {issue.timeToFix}</span>
                                  <h4 className="text-xl md:text-2xl font-black text-white font-outfit tracking-tight">{issue.title}</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-eu-accent font-outfit">Neural Mapping</p>
                                    <p className="text-base text-slate-300 leading-relaxed font-medium">{issue.whatThisMeans}</p>
                                  </div>
                                  <div className="space-y-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-500 font-outfit">Impact Matrix</p>
                                    <p className="text-base text-slate-300 leading-relaxed font-medium">{issue.whyItMatters}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {issue.howToFix?.beginner && (
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400 font-outfit">Non-Technical Fix</p>
                                      <p className="text-sm text-slate-400 leading-relaxed font-medium">{issue.howToFix.beginner}</p>
                                    </div>
                                  )}
                                  {issue.howToFix?.developer && (
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-eu-accent font-outfit">Developer Fix</p>
                                      <p className="text-sm text-slate-400 font-mono leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">{issue.howToFix.developer}</p>
                                    </div>
                                  )}
                                </div>
                                {issue.remediationCode && (
                                  <button 
                                    onClick={() => setRemediationCode(issue.remediationCode)}
                                    className="w-full py-5 bg-eu-accent/20 hover:bg-eu-accent text-white border border-eu-accent/40 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-neon group font-outfit"
                                  >
                                    <Code size={18} className="group-hover:rotate-12 transition-transform" />
                                    Initialize Automated Patch Protocol
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-6 p-10 rounded-[32px] bg-emerald-500/5 border border-emerald-500/20 shadow-neon">
                        <CheckCircle2 size={32} className="text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-xl font-black text-emerald-400 font-outfit uppercase tracking-widest">Architectural Integrity Confirmed</p>
                          <p className="text-sm text-slate-400 mt-1 font-medium italic">Sentinal AI has verified all nodes. No deviations from standard protocols were detected.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-12 pt-10 border-t border-white/5 mt-12">
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] font-outfit">Analysis Engine</span>
                        <span className="text-sm font-bold text-eu-accent uppercase tracking-widest font-outfit">GPT-4.1 Euphoria Cortex</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] font-outfit">Processing Threads</span>
                        <span className="text-sm font-bold text-white uppercase tracking-widest font-outfit">{report.pagesCrawled || 1} Nodes Scanned</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : report.status === 'completed' ? (
                <div className="flex items-center gap-8 p-12 rounded-[40px] border border-white/5 bg-white/2 glass-euphoria">
                  <div className="size-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 text-slate-500 shadow-inner"><Cpu size={32} /></div>
                  <div>
                    <p className="text-xl font-black text-slate-300 font-outfit uppercase tracking-widest">Neural Uplink Silenced</p>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Cognitive analysis is currently unavailable. Ensure the neural key (API_KEY) is valid in the server config.</p>
                  </div>
                </div>
              ) : null}

              {/* ── Quick Stats Grid ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                <StatCard label="Structural Health" value={`${healthScore}%`} color={healthScore > 80 ? 'text-emerald-400' : healthScore > 40 ? 'text-amber-500' : 'text-rose-500'} icon={<Shield size={24} />} />
                <StatCard label="Neural Latency" value={`${report.performanceMetrics?.loadTime?.toFixed(0) || 0} ms`} color="text-eu-accent" icon={<Zap size={24} />} />
                <StatCard label="Data Packets" value={report.performanceMetrics?.requestCount || 0} color="text-white" icon={<Wifi size={24} />} />
                <StatCard label="Crawl Depth" value={report.pagesCrawled || 0} color="text-indigo-400" icon={<ExternalLink size={24} />} />
              </div>

              {/* ── Lighthouse Performance Matrix ── */}
              {report.lighthouseScores && (
                <div className="glass-euphoria p-10 md:p-16 rounded-[48px] border-white/5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-eu-accent/40" />
                  <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="max-w-xs space-y-4">
                      <h3 className="text-3xl font-black uppercase tracking-tight-mega text-white font-outfit">Lighthouse <span className="text-eu-accent italic">Sync</span></h3>
                      <p className="text-slate-500 text-sm font-medium leading-relaxed">Chrome DevTools diagnostic scores synchronized via automated crawl protocols.</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 md:gap-20">
                      <LighthouseCircle label="Performance" score={report.lighthouseScores.performance} />
                      <LighthouseCircle label="Neural SEO" score={report.lighthouseScores.seo} />
                      <LighthouseCircle label="Protocols" score={report.lighthouseScores.bestPractices} />
                      <LighthouseCircle label="Inclusion" score={report.lighthouseScores.accessibility} />
                    </div>
                  </div>
                </div>
              )}



              {/* ── Smart Form Test Summary ── */}
               {(report.smartFormTests?.length > 0) && (
                 <div className="glass-euphoria p-5 rounded-2xl border border-white/5 space-y-6">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="size-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-eu-accent shadow-neon"><CheckCircle2 size={16} /></div>
                       <div>
                         <h3 className="text-base font-black uppercase tracking-tight text-white font-outfit">Form <span className="text-eu-accent italic">Diagnostics</span></h3>
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] font-outfit mt-0.5 italic">{report.smartFormTests.length} test cycles</p>
                       </div>
                     </div>
                     <button onClick={() => setActiveTab('smartformtests')} className="px-4 py-2 bg-eu-accent/10 hover:bg-eu-accent text-white border border-eu-accent/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-neon font-outfit">
                       Analyze Cycles
                     </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {report.smartFormTests.slice(0, 3).map((test, i) => (
                       <div key={i} className="group rounded-2xl overflow-hidden bg-white/5 border border-white/5 hover:border-eu-accent/30 transition-all duration-700 shadow-lg cursor-pointer" onClick={() => setPreviewImage(`http://localhost:5000${test.screenshot}`)}>
                         <div className="relative aspect-video bg-black/40 overflow-hidden">
                           {test.screenshot ? (
                             <img src={`http://localhost:5000${test.screenshot}`} alt={test.formName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-600"><FormInput size={16} /></div>
                           )}
                           <div className="absolute top-2 left-2">
                             <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest backdrop-blur-md border ${
                               test.status === 'Blocked' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                               : test.status === 'Accepted' ? 'bg-eu-accent/20 text-eu-accent border-eu-accent/20'
                               : 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                             } shadow-neon`}>{test.status}</span>
                           </div>
                         </div>
                         <div className="p-3 flex items-center justify-between gap-2">
                           <div className="min-w-0">
                             <p className="text-[9px] font-black text-eu-accent uppercase tracking-[0.2em] font-outfit">{test.formName}</p>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 leading-relaxed italic truncate font-outfit opacity-70">"{test.details}"</p>
                           </div>
                           <div className="size-7 bg-white/5 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-eu-accent transition-all border border-white/5 shadow-inner flex-shrink-0">
                               <ExternalLink size={10} />
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </motion.div>
          )}

          {activeTab !== 'summary' && activeTab !== 'screenshots' && activeTab !== 'smartformtests' && (
            <motion.div key="table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass p-6 rounded-2xl overflow-hidden">
              <SectionHeader title={tabs.find(t => t.id === activeTab).label} icon={tabs.find(t => t.id === activeTab).icon} />
              <IssueTable data={getTabData(report, activeTab)} columns={getTableColumns(activeTab)} setRemediationCode={setRemediationCode} />
            </motion.div>
          )}

          {activeTab === 'smartformtests' && (
            <motion.div key="smartformtests" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-8">
              <div className="glass-euphoria p-6 md:p-8 rounded-[32px] border-white/5 shadow-2xl">
                <div className="flex items-center gap-6 mb-10">
                  <div className="size-12 bg-eu-accent/20 rounded-2xl flex items-center justify-center border border-eu-accent/30 text-eu-accent shadow-neon"><CheckCircle2 size={24} /></div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-outfit">Smart Form <span className="text-eu-accent italic">Diagnostics</span></h3>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] font-outfit mt-1 italic">{report.smartFormTests?.length || 0} autonomous injection cycles complete</p>
                  </div>
                </div>

                {(!report.smartFormTests || report.smartFormTests.length === 0) ? (
                  <div className="text-center py-32 rounded-[32px] bg-white/2 border border-dashed border-white/10">
                    <div className="size-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20"><CheckCircle2 className="text-emerald-500" size={40} /></div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-widest font-outfit mb-3">No Deviations Detected</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">Smart form testing did not identify any exploitable endpoints or structural vulnerabilities.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {report.smartFormTests.map((test, i) => {
                      const isBlocked = test.status === 'Blocked';
                      const isAccepted = test.status === 'Accepted';
                      const statusColor = isBlocked
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20'
                        : isAccepted
                        ? 'bg-eu-accent/10 text-eu-accent border-eu-accent/20 shadow-eu-accent/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/20';
                      
                      return (
                        <div key={i} className="group glass-euphoria rounded-2xl overflow-hidden border border-white/5 hover:border-eu-accent/30 transition-all duration-700 hover:-translate-y-1 flex flex-col shadow-xl">
                          <div className="relative aspect-video bg-black/40 overflow-hidden border-b border-white/5">
                            {test.screenshot ? (
                              <img src={`http://localhost:5000${test.screenshot}`} alt={test.formName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-700"><FormInput size={24} /></div>
                            )}
                            <div className="absolute top-3 left-3">
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${statusColor} backdrop-blur-xl shadow-neon`}>
                                {test.status}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-black/60 border border-white/10 text-white backdrop-blur-xl">
                                {test.testType}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 space-y-4 flex-1 flex flex-col justify-between bg-white/[0.02]">
                            <div>
                              <p className="text-[9px] font-black text-eu-accent uppercase tracking-[0.2em] font-outfit mb-2">{test.formName}</p>
                              <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic opacity-80 line-clamp-2">"{test.details}"</p>
                            </div>
                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest font-outfit">Confidence</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest font-outfit ${test.confidence === 'High' ? 'text-emerald-400' : 'text-amber-400'}`}>{test.confidence} Pulse</span>
                                </div>
                                <button 
                                  onClick={() => setPreviewImage(`http://localhost:5000${test.screenshot}`)}
                                  className="size-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-500 hover:text-eu-accent hover:bg-eu-accent/10 transition-all border border-white/5 shadow-inner"
                                >
                                    <ExternalLink size={12} />
                                </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'screenshots' && (
             <motion.div key="screenshots" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {(report.screenshots || []).map((s, i) => (
                 <div key={i} className="group glass-euphoria p-3 rounded-2xl space-y-3 border border-white/5 hover:border-eu-accent/30 transition-all duration-700 hover:-translate-y-1 shadow-xl">
                   <div className="aspect-video overflow-hidden rounded-xl bg-white/5 border border-white/10 shadow-inner relative">
                     <img src={`http://localhost:5000${s.path}`} alt={s.page} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-3">
                        <p className="text-[8px] font-black text-white uppercase tracking-widest">{s.page}</p>
                     </div>
                   </div>
                   <div className="flex items-center justify-between px-1">
                     <div className="space-y-0.5 min-w-0">
                        <p className="text-[8px] font-black text-eu-accent uppercase tracking-[0.2em] font-outfit">{s.type}</p>
                        <p className="text-[11px] font-black text-white truncate max-w-[150px] font-outfit">{s.page}</p>
                     </div>
                     <button 
                       onClick={() => setPreviewImage(`http://localhost:5000${s.path}`)}
                       className="size-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-eu-accent transition-all border border-white/5 shadow-inner"
                     >
                        <ExternalLink size={12} />
                     </button>
                   </div>
                 </div>
               ))}
             </motion.div>
          )}
        </AnimatePresence>
      </div>

       {/* ── Image Preview Modal ── */}
       {previewImage && createPortal(
         <AnimatePresence>
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             onClick={() => setPreviewImage(null)}
             className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-20"
           >
             <div className="absolute top-8 right-8 text-white/40 hover:text-white cursor-pointer transition-all hover:scale-110">
                 <AlertCircle size={48} className="rotate-45" />
             </div>
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 30 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 30 }}
               onClick={e => e.stopPropagation()}
               className="relative max-w-7xl max-h-[92vh] glass-euphoria p-1.5 rounded-[32px] border-white/10 shadow-[0_0_120px_rgba(var(--eu-accent-rgb),0.25)] flex items-center justify-center"
             >
               <img src={previewImage} alt="Neural Preview" className="max-w-full max-h-[85vh] rounded-[26px] object-contain shadow-2xl" />
             </motion.div>
           </motion.div>
         </AnimatePresence>,
         document.body
       )}

       {/* Remediation Modal */}
       {remediationCode && createPortal(
         <AnimatePresence>
           <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-10 bg-slate-950/90 backdrop-blur-xl"
             onClick={() => setRemediationCode(null)}
           >
             <motion.div
               initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 40 }}
               className="w-full max-w-4xl glass-euphoria rounded-[48px] overflow-hidden shadow-neon"
               onClick={e => e.stopPropagation()}
             >
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/5 bg-white/2">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-eu-accent/20 rounded-xl flex items-center justify-center border border-eu-accent/20 text-eu-accent shadow-neon"><Code size={20} /></div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-outfit">AI <span className="premium-gradient-text">Remediation</span></h3>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Authenticated Logic Patch v4.2</p>
                    </div>
                  </div>
                 <button onClick={() => setRemediationCode(null)} className="size-12 hover:bg-white/5 rounded-2xl text-slate-500 flex items-center justify-center transition-all group">
                   <AlertCircle size={28} className="rotate-45 group-hover:scale-110" />
                 </button>
               </div>
               <div className="p-8 sm:p-12 space-y-10">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-industrial text-slate-500"><Terminal size={16} /> Recommended Syntax_Construct</div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(remediationCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="flex items-center gap-3 px-6 py-2.5 bg-white/5 hover:bg-eu-accent/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/5 shadow-inner"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} {copied ? 'Copied to Clipboard' : 'Copy Logic'}
                    </button>
                 </div>
                 <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-black/60 rounded-[32px] border border-white/5 p-8 md:p-12 shadow-inner">
                   <pre className="text-sm sm:text-base font-mono text-eu-accent/90 leading-relaxed whitespace-pre-wrap">{remediationCode}</pre>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         </AnimatePresence>,
         document.body
       )}
    </div>
  );
};

export default ReportDetail;
