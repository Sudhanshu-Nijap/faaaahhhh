import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ExternalLink, AlertTriangle, Terminal, Layout,
  FormInput, Image, Zap, Smartphone, UserCheck, Loader2,
  CheckCircle2, Info, AlertCircle, BarChart3, Database, Shield, Cpu,
  Wifi, Trash2
} from 'lucide-react';
import axios from 'axios';

const ReportDetail = ({ reportId, onBack }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/report/${reportId}`);
        setReport(response.data);
      } catch (error) {
        console.error('Failed to fetch report', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
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
    { id: 'summary', label: 'Summary', icon: <Zap size={18} /> },
    { id: 'network', label: 'Network Log', icon: <Wifi size={18} />, count: report.networkLogs?.length || 0 },
    { id: 'links', label: 'Broken Links', icon: <ExternalLink size={18} />, count: report.brokenLinks?.length || 0 },
    { id: 'console', label: 'Console', icon: <Terminal size={18} />, count: report.consoleErrors?.length || 0 },
    { id: 'layout', label: 'Layout & UX', icon: <Layout size={18} />, count: (report.uiIssues?.length || 0) + (report.responsiveIssues?.length || 0) },
    { id: 'forms', label: 'Forms', icon: <FormInput size={18} />, count: report.formIssues?.length || 0 },
    { id: 'assets', label: 'Assets', icon: <Image size={18} />, count: report.assetIssues?.length || 0 },
    { id: 'accessibility', label: 'Accessibility', icon: <UserCheck size={18} />, count: report.accessibilityIssues?.length || 0 },
    { id: 'screenshots', label: 'Screenshots', icon: <Image size={18} />, count: report.screenshots?.length || 0 },
  ];

  const totalIssues = tabs.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const healthScore = Math.max(0, 100 - (totalIssues * 5));

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/50 transition-all text-text-muted hover:text-white group"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-black gradient-text tracking-tight uppercase italic">{new URL(report.url).hostname}</h2>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${report.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                {report.status}
              </span>
            </div>
            <p className="text-text-muted text-sm font-medium mt-1 flex items-center gap-2">
              <Database size={14} className="opacity-50" /> Log ID: {report._id.slice(-8).toUpperCase()} • Estab: {new Date(report.scanDate).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              if (window.confirm("Purge this diagnostic log from the system?")) {
                try {
                  await axios.delete(`http://localhost:5000/api/report/${reportId}`);
                  onBack();
                } catch (e) {
                  alert("Failed to purge log.");
                }
              }
            }}
            className="flex items-center gap-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all text-rose-500"
          >
            Purge Record <Trash2 size={18} />
          </button>
          <button 
            onClick={async () => {
              try {
                const res = await axios.get(`http://localhost:5000/api/report/${reportId}/export`);
                window.open(`http://localhost:5000${res.data.url}`, '_blank');
              } catch (e) {
                alert("Failed to generate export.");
              }
            }}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all text-white border border-white/10"
          >
            Export PDF <Database size={18} />
          </button>
          <a 
            href={report.url} 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-3 bg-primary hover:bg-primary/90 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-primary/20 text-white"
          >
            Access Domain <ExternalLink size={18} />
          </a>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-3 p-2 bg-white/5 border border-white/5 rounded-[24px] no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl whitespace-nowrap transition-all duration-300 font-bold text-sm ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20 ring-1 ring-white/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${activeTab === tab.id ? 'bg-white/20 text-white' : tab.count > 0 ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20' : 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-12">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatCard label="Security Health" value={`${healthScore}%`} color={healthScore > 80 ? 'text-green-400' : healthScore > 40 ? 'text-yellow-500' : 'text-red-500'} icon={<Shield size={20} />} />
                <StatCard label="Uplink Signals" value={`${report.performanceMetrics?.requestCount || 0}`} color="text-white" icon={<Wifi size={20} />} />
                <StatCard label="Latency (Avg)" value={`${report.performanceMetrics?.loadTime?.toFixed(0) || 0} ms`} color="text-primary" icon={<Zap size={20} />} />
                <StatCard label="Slow Requests" value={report.performanceMetrics?.slowRequests || 0} color={report.performanceMetrics?.slowRequests > 0 ? 'text-amber-400' : 'text-green-400'} icon={<AlertTriangle size={20} />} />
              </div>

              {/* Lighthouse Official Scores */}
              {report.lighthouseScores && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 p-10 glass rounded-[32px] border border-white/5 bg-white/[0.02]">
                  <LighthouseCircle label="Performance" score={report.lighthouseScores.performance} />
                  <LighthouseCircle label="SEO" score={report.lighthouseScores.seo} />
                  <LighthouseCircle label="Best Practices" score={report.lighthouseScores.bestPractices} />
                  <LighthouseCircle label="Access" score={report.lighthouseScores.accessibility} />
                </div>
              )}

              {/* AI Insights Section */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative glass p-10 rounded-[32px] border-primary/20 bg-primary/5">
                  <div className="flex flex-col md:flex-row gap-10 items-center">
                    <div className="shrink-0 p-8 bg-primary/20 rounded-[28px] border border-primary/30 shadow-2xl">
                      <Cpu size={64} className="text-primary glow-primary animate-float" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-primary text-[10px] font-black uppercase tracking-widest rounded-lg">AI Diagnosis</div>
                        {report.aiInsights?.classification?.includes('Simulated') && (
                          <div className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black uppercase tracking-tighter rounded-full">Simulation Trace</div>
                        )}
                        <h3 className="text-2xl font-black uppercase tracking-tight italic">
                          System <span className="text-primary italic">Intelligence</span> Report
                        </h3>
                      </div>
                      <p className="text-xl font-bold italic text-white/90">"{report.aiInsights?.classification || 'Analyzing Infrastructure...'}"</p>
                      <p className="text-text-muted leading-relaxed max-w-2xl font-medium">
                        {report.aiInsights?.summary || 'The autonomous agent is synthesizing detected signals to provide a high-level security audit.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab !== 'summary' && activeTab !== 'screenshots' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass p-8 rounded-[32px] overflow-hidden"
            >
              <SectionHeader title={tabs.find(t => t.id === activeTab).label} icon={tabs.find(t => t.id === activeTab).icon} />
              <IssueTable data={getTabData(report, activeTab)} columns={getTableColumns(activeTab)} />
            </motion.div>
          )}

          {activeTab === 'screenshots' && (
            <motion.div
              key="screenshots"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {(report.screenshots || []).map((s, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="space-y-4 glass p-4 rounded-3xl"
                >
                  <div className="aspect-video overflow-hidden rounded-2xl bg-white/5 border border-white/10 group">
                    <img src={`http://localhost:5000${s.path}`} alt={s.page} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="px-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{s.type}</p>
                    <p className="text-sm font-bold text-white truncate">{s.page}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper components for modularity
const StatCard = ({ label, value, color, icon }) => (
  <div className="glass p-6 rounded-[28px] border-white/5 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      {icon}
    </div>
    <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.15em] mb-2">{label}</p>
    <p className={`text-3xl font-black ${color} tracking-tighter`}>{value}</p>
  </div>
);

const SectionHeader = ({ title, icon }) => (
  <div className="flex items-center gap-4 mb-10">
    <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-primary">
      {icon}
    </div>
    <h3 className="text-2xl font-black uppercase tracking-tight italic">{title} <span className="text-primary italic">Index</span></h3>
  </div>
);

const getTabData = (report, tab) => {
  switch (tab) {
    case 'network': return report.networkLogs;
    case 'links': return report.brokenLinks;
    case 'console': return report.consoleErrors;
    case 'layout': return [...(report.uiIssues || []), ...(report.responsiveIssues || [])];
    case 'forms': return report.formIssues;
    case 'assets': return report.assetIssues;
    case 'accessibility': return report.accessibilityIssues;
    default: return [];
  }
};

const getTableColumns = (tab) => {
  switch (tab) {
    case 'network': return ['Method', 'Status', 'Time', 'Url', 'Fix Guide'];
    case 'links': return ['Page', 'Link', 'Status', 'Fix Guide'];
    case 'console': return ['Page', 'Message', 'Type', 'Fix Guide'];
    case 'layout': return ['Page', 'Device', 'Issue', 'Selector', 'Fix Guide'];
    case 'forms': return ['Page', 'Issue', 'Details', 'Fix Guide'];
    case 'assets': return ['Page', 'Asset URL', 'Status', 'Fix Guide'];
    case 'accessibility': return ['Page', 'Issue', 'Severity', 'Element', 'Fix Guide'];
    default: return [];
  }
};

const IssueTable = ({ data, columns }) => {
  if (!data || data.length === 0) return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
        <CheckCircle2 className="text-green-500" size={32} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No Anomalies Detected</h3>
      <p className="text-text-muted text-sm max-w-xs mx-auto">This protocol has returned zero active failures for the selected target parameters.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto -mx-8 px-8 no-scrollbar">
      <table className="w-full text-left border-separate border-spacing-y-2">
        <thead>
          <tr>
            {columns.map(col => <th key={col} className="pb-6 px-6 text-[10px] font-black text-text-muted uppercase tracking-widest">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="group transition-all hover:bg-white/5">
              {columns.map(col => {
                const columnToKey = {
                  'Asset URL': 'assetUrl',
                  'Form Selector': 'formSelector',
                  'Scan Date': 'scanDate',
                  'Load Time': 'loadTime',
                  'API Response Time': 'apiResponseTime',
                  'Broken Links': 'brokenLinks',
                  'Console Errors': 'consoleErrors',
                  'UI Issues': 'uiIssues',
                  'Form Issues': 'formIssues',
                  'Asset Issues': 'assetIssues',
                  'Performance Metrics': 'performanceMetrics',
                  'Responsive Issues': 'responsiveIssues',
                  'Accessibility Issues': 'accessibilityIssues',
                  'AI Insights': 'aiInsights',
                  'Fix Guide': 'recommendation',
                  'Element': 'element'
                };

                const key = columnToKey[col] || col.toLowerCase().replace(/\s/g, '');
                let value = row[key];

                // Hard fallback for Accessibility Tab
                if (col === 'Element' && row.element) value = row.element;
                if (col === 'Issue' && row.issue) value = row.issue;

                // Special handling for specific columns
                if (col === 'Status') {
                  const isCrit = parseInt(value) >= 400;
                  return (
                    <td key={col} className="py-4 px-6 bg-white/[0.02] first:rounded-l-2xl last:rounded-r-2xl border-y border-white/5 first:border-l last:border-r">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${isCrit ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                        {value || '0'}
                      </span>
                    </td>
                  )
                }

                if (col === 'Severity' || col === 'Type') {
                  const isError = value === 'error' || value === 'critical';
                  const isWarning = value === 'warning' || value === 'warn';
                  const isInfo = value === 'info' || value === 'log';
                  
                  return (
                    <td key={col} className="py-4 px-6 bg-white/[0.02] first:rounded-l-2xl last:rounded-r-2xl border-y border-white/5 first:border-l last:border-r">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                        isError ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        isWarning ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        isInfo ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-white/10 text-white border border-white/20'
                      }`}>
                        {value}
                      </span>
                    </td>
                  )
                }

                if (col === 'Element' || col === 'Selector' || col === 'Form Selector' || col === 'Message') {
                  return (
                    <td key={col} className="py-4 px-6 bg-white/[0.02] first:rounded-l-2xl last:rounded-r-2xl border-y border-white/5 first:border-l last:border-r">
                      <code className="text-[10px] bg-black/40 px-2 py-1 rounded-md text-primary/80 border border-primary/20 block max-w-[200px] md:max-w-[400px] whitespace-normal md:truncate" title={value}>
                        {value || '-'}
                      </code>
                    </td>
                  )
                }

                if (col === 'Fix Guide') {
                  return (
                    <td key={col} className="py-4 px-6 bg-white/[0.04] first:rounded-l-2xl last:rounded-r-2xl border-y border-white/5 first:border-l last:border-r">
                      <div className="flex items-start gap-2">
                        <div className="mt-1 flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        </div>
                        <span className="text-sm font-medium text-emerald-400/90 leading-relaxed italic">{value || 'No specific recommendation.'}</span>
                      </div>
                    </td>
                  )
                }

                return (
                  <td key={col} className="py-4 px-6 bg-white/[0.02] first:rounded-l-2xl last:rounded-r-2xl border-y border-white/5 first:border-l last:border-r vertical-align-top">
                    <span className="text-sm font-medium text-white/80 block max-w-xs truncate md:max-w-md" title={value}>{value || '-'}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportDetail;

const LighthouseCircle = ({ label, score }) => {
  const getScoreColor = (s) => {
    if (s >= 90) return 'text-green-500 stroke-green-500';
    if (s >= 50) return 'text-orange-500 stroke-orange-500';
    return 'text-red-500 stroke-red-500';
  };

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6" className="text-white/5" />
          <circle 
            cx="48" cy="48" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-black ${getScoreColor(score).split(' ')[0]}`}>{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{label}</span>
    </div>
  );
};
