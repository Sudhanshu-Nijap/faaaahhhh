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
      case 'ATTACK': return <Skull size={14} className="text-primary" />;
      case 'IMPACT': return <Zap size={14} className="text-primary shadow-neon" />;
      case 'SUCCESS': return <Shield size={14} className="text-primary" />;
      default: return <Activity size={14} className="text-[var(--eu-text-main)] opacity-40" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--eu-bg-void)] border border-primary/20 rounded-[32px] overflow-hidden shadow-2xl relative">
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-[0.03] z-10" />
      
      {/* Header */}
      <div className="p-6 border-b border-primary/10 flex items-center justify-between bg-primary/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 animate-pulse">
            <Skull className="text-primary size-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-[12px] font-black tracking-industrial text-primary uppercase">CYBER_RANGE_LIVE</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="size-1.5 rounded-full bg-primary animate-ping" />
              <span className="text-[8px] font-mono text-[var(--eu-text-main)] opacity-40 uppercase tracking-widest">Autonomous Chaos Monitoring Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-2 py-1 bg-[var(--eu-bg-void)]/60 border border-[var(--eu-glass-border)] rounded-md">
                <span className="text-[8px] font-mono text-[var(--eu-text-main)] opacity-40 uppercase">Threads: 08</span>
            </div>
            <Terminal size={16} className="text-primary/40" />
        </div>
      </div>

      {/* Logs */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[11px] custom-scrollbar bg-[var(--eu-bg-void)]/40"
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
              className="flex items-start gap-4 p-3 bg-[var(--eu-bg-void)]/30 border border-[var(--eu-glass-border)] rounded-xl hover:bg-[var(--eu-bg-void)]/50 transition-colors"
            >
              <div className="mt-1">{getEventIcon(ev.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[var(--eu-text-main)] opacity-40 shrink-0">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    ev.type === 'IMPACT' ? 'bg-primary/20 text-primary border border-primary/20' :
                    ev.type === 'ATTACK' ? 'bg-primary/20 text-primary border border-primary/20' :
                    'bg-primary/20 text-primary border border-primary/20'
                  }`}>
                    {ev.type}
                  </span>
                  <span className="text-primary/60 text-[9px] uppercase font-black">{ev.source}</span>
                </div>
                <p className="text-[var(--eu-text-main)] leading-relaxed uppercase tracking-tighter font-medium opacity-80">
                  {ev.message}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer / Stats */}
      <div className="p-4 bg-[var(--eu-bg-card)] border-t border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] text-[var(--eu-text-main)] opacity-40 uppercase">Total_Attacks</span>
              <span className="text-xs font-black text-primary">{events.filter(e => e.type === 'ATTACK').length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-[var(--eu-text-main)] opacity-40 uppercase">Impacts_Found</span>
              <span className="text-xs font-black text-primary">{events.filter(e => e.type === 'IMPACT').length}</span>
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
