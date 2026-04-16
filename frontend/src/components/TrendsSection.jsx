import { API_URL, SOCKET_URL } from '../config/api';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Zap, BarChart3, Database } from 'lucide-react';
import axios from 'axios';

const TrendsSection = ({ url, userId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/stats/trends?url=${url}&userId=${userId}`);
        setHistory(data);
      } catch (err) {
        console.error("Failed to fetch trends", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [url, userId]);

  if (loading) return (
    <div className="h-[300px] flex flex-col items-center justify-center glass-euphoria rounded-[32px] border-[var(--eu-glass-border)] opacity-40">
        <div className="size-8 border-2 border-[var(--eu-accent)] border-t-transparent animate-spin rounded-full mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest">Neural History Search...</p>
    </div>
  );

  if (history.length < 2) return (
    <div className="h-[300px] flex flex-col items-center justify-center glass-euphoria rounded-[32px] border-[var(--eu-glass-border)] p-10 text-center">
        <Activity size={32} className="text-[var(--eu-text-main)] opacity-20 mb-4" />
        <p className="text-[12px] font-black uppercase tracking-widest text-[var(--eu-text-main)] opacity-40 font-outfit">Insufficient Historical Data</p>
        <p className="text-[10px] font-medium text-[var(--eu-text-main)] opacity-40 mt-2 lowercase tracking-tighter italic">Run more scans of this domain to generate comparative intelligence.</p>
    </div>
  );

  const maxVal = 100;
  const padding = 40;
  const width = 800;
  const height = 200;
  
  const getPoints = (data, key) => {
    return data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const val = key === 'health' ? d.healthScore : d.performanceMetrics?.loadTime || 0;
      // Normalize loadTime if needed, but for now health is 0-100
      const y = height - padding - (val / maxVal) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
  };

  const healthPoints = getPoints(history, 'health');

  return (
    <div className="glass-euphoria p-8 md:p-12 rounded-[40px] border border-[var(--eu-glass-border)] relative overflow-hidden shadow-2xl">
      <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={16} className="text-primary" />
              <h3 className="text-[12px] font-black uppercase tracking-industrial text-white">Delta Intelligence</h3>
           </div>
           <p className="text-[10px] font-medium text-[var(--eu-text-muted)] lowercase tracking-tighter italic">
             Historical health evolution for {(() => {
               try { return new URL(url).hostname; }
               catch (e) { return url; }
             })()}
           </p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col text-right">
              <span className="text-[8px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest">Growth_Theta</span>
              <span className="text-xs font-black text-primary font-outfit">+{Math.round((history[history.length-1].healthScore - history[0].healthScore))} Pts</span>
           </div>
           <div className="size-px h-8 bg-white/5" />
           <div className="flex flex-col text-right">
              <span className="text-[8px] font-black text-[var(--eu-text-muted)] uppercase tracking-widest">Protocol_Uptime</span>
              <span className="text-xs font-black text-white font-outfit">99.9%</span>
           </div>
        </div>
      </div>

      <div className="relative h-[200px] w-full">
         <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
               <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(var(--eu-accent-rgb), 0.4)" />
                  <stop offset="100%" stopColor="rgba(var(--eu-accent-rgb), 0)" />
               </linearGradient>
            </defs>
            
            {/* Grid Lines */}
            {[0, 25, 50, 75, 100].map(v => {
               const y = height - padding - (v / maxVal) * (height - 2 * padding);
               return <line key={v} x1={padding} y1={y} x2={width-padding} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />;
            })}

            {/* Area */}
            <path
               d={`M ${padding},${height-padding} L ${healthPoints} L ${width-padding},${height-padding} Z`}
               fill="url(#areaGradient)"
            />

            {/* Line */}
            <motion.polyline
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 1 }}
               transition={{ duration: 2 }}
               fill="none"
               stroke="var(--eu-accent)"
               strokeWidth="3"
               strokeLinecap="round"
               strokeLinejoin="round"
               points={healthPoints}
               filter="drop-shadow(0 0 8px rgba(var(--eu-accent-rgb), 0.5))"
            />

            {/* Points */}
            {history.map((d, i) => {
               const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
               const y = height - padding - (d.healthScore / maxVal) * (height - 2 * padding);
               return (
                  <motion.circle
                     key={i}
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ delay: 1 + i * 0.1 }}
                     cx={x} cy={y} r="4"
                     fill="var(--eu-accent)"
                     stroke="#fff"
                     strokeWidth="2"
                  />
               );
            })}
         </svg>
      </div>

      <div className="flex items-center justify-between mt-8">
         <div className="flex items-center gap-8">
            {history.map((d, i) => (
               <div key={i} className="flex flex-col opacity-40 hover:opacity-100 transition-opacity">
                  <span className="text-[8px] font-black text-[var(--eu-text-main)] opacity-40 uppercase tracking-widest">{new Date(d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  <span className="text-[10px] font-black text-[var(--eu-text-main)] font-outfit">{d.healthScore}%</span>
               </div>
            ))}
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <span className="size-2 rounded-full bg-eu-accent" />
               <span className="text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-main)] opacity-40">Health_Score</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TrendsSection;
