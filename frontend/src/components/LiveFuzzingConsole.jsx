import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Shield, Zap, Skull, Activity, Cpu, Loader2 } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const LiveFuzzingConsole = ({ reportId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(SOCKET_URL);

    const fetchInitialEvents = async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/api/report/${reportId}`);
        if (data.liveEvents) {
          setEvents(data.liveEvents);
        }
      } catch (err) {
        console.error("Failed to sync initial live events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialEvents();

    socket.emit('join-room', reportId.toString());

    socket.on('scan-event', (event) => {
        setEvents(prev => [...prev, event]);
    });

    return () => socket.disconnect();
  }, [reportId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type) => {
    switch (type) {
      case 'ATTACK': return <Skull size={14} className="text-rose-500" />;
      case 'IMPACT': return <Zap size={14} className="text-amber-500 shadow-neon" />;
      case 'SUCCESS': return <Shield size={14} className="text-emerald-500" />;
      default: return <Activity size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-primary/20 rounded-[32px] overflow-hidden shadow-2xl relative">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-[0.03] z-10" />
      
      {/* Header */}
      <div className="p-6 border-b border-primary/10 flex items-center justify-between bg-primary/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/30 animate-pulse">
            <Skull className="text-rose-500 size-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-[12px] font-black tracking-industrial text-rose-500 uppercase">CYBER_RANGE_LIVE</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">Autonomous Chaos Monitoring Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-2 py-1 bg-white/5 border border-white/10 rounded-md">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Threads: 08</span>
            </div>
            <Terminal size={16} className="text-rose-500/40" />
        </div>
      </div>

      {/* Logs */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[11px] custom-scrollbar bg-black/40"
      >
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
            <Loader2 className="animate-spin text-primary" size={24} />
            <p className="uppercase tracking-widest text-[10px] font-black">Waiting for neural injection events...</p>
          </div>
        ) : (
          events.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              <div className="mt-1">{getEventIcon(ev.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-slate-500 shrink-0">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    ev.type === 'IMPACT' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' :
                    ev.type === 'ATTACK' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/20' :
                    'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {ev.type}
                  </span>
                  <span className="text-primary/60 text-[9px] uppercase font-black">{ev.source}</span>
                </div>
                <p className="text-slate-300 leading-relaxed uppercase tracking-tighter font-medium">
                  {ev.message}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer / Stats */}
      <div className="p-4 bg-slate-900/60 border-t border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Total_Attacks</span>
              <span className="text-xs font-black text-rose-500">{events.filter(e => e.type === 'ATTACK').length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 uppercase">Impacts_Found</span>
              <span className="text-xs font-black text-amber-500">{events.filter(e => e.type === 'IMPACT').length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-lg">
             <Cpu size={12} className="text-primary" />
             <span className="text-[9px] font-black text-primary uppercase">Cortex Synchronized</span>
          </div>
      </div>
    </div>
  );
};

export default LiveFuzzingConsole;
