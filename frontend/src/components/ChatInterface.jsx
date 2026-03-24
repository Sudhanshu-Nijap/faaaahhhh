import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Terminal,
  Cpu,
  Bot,
  User,
  Zap,
  Shield,
  Loader2,
  Globe,
  Activity,
  Bug,
  Lock,
  ArrowRight,
  Layout,
  Pin
} from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const ChatInterface = ({ onScanStarted, activeReportId, onViewFullReport, onRefresh }) => {
  const [sessionUrl, setSessionUrl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const scrollRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  const userId = localStorage.getItem('userId');

  // Real-time Neural Uplink (Socket)
  useEffect(() => {
    if (!activeReportId) return;

    const socket = io(SOCKET_URL);

    socket.emit('join-room', activeReportId.toString());

    socket.on('scan-event', (event) => {
      setMessages(prev => {
        const lastAiMsgIdx = [...prev].reverse().findIndex(m => m.type === 'ai' && m.isInitial);
        if (lastAiMsgIdx !== -1) {
          const actualIdx = prev.length - 1 - lastAiMsgIdx;
          const newMessages = [...prev];
          const updatedMsg = { ...newMessages[actualIdx] };
          updatedMsg.recentEvents = [event, ...(updatedMsg.recentEvents || [])].slice(0, 10);
          newMessages[actualIdx] = updatedMsg;
          return newMessages;
        }
        return prev;
      });
    });

    return () => socket.disconnect();
  }, [activeReportId]);

  // Handle Session Switching
  useEffect(() => {
    if (activeReportId) {
      const loadSession = async () => {
        setIsTyping(true);
        try {
          const { data } = await axios.get(`${API_URL}/report/${activeReportId}`);
          setSessionUrl(data.url);
          setMessages([
            {
              id: Date.now(),
              type: 'ai',
              isInitial: true,
              text: `Session Synchronized: ${new URL(data.url).hostname}. Diagnostic matrix for version ${data._id.substring(0, 8)} loaded.`,
              analysis: data.aiInsights,
              recentEvents: data.liveEvents?.slice(-5).reverse() || []
            }
          ]);
          setIsPinned(data.isPinned || false);
        } catch (err) {
          console.error("Failed to load session", err);
        } finally {
          setIsTyping(false);
        }
      };
      loadSession();
    } else {
      setSessionUrl(null);
      setMessages([
        {
          id: 1,
          type: 'ai',
          text: "Sentinel QA GPT v4.2 Online. Provide a Target Infrastructure URL to initialize a testing session."
        }
      ]);
    }
  }, [activeReportId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e, forcedMessage = null) => {
    if (e) e.preventDefault();
    const userMsg = forcedMessage || input.trim();
    if (!userMsg || isTyping) return;

    if (!forcedMessage) setInput('');
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const { data } = await axios.post(`${API_URL}/chat/command`, {
        message: userMsg,
        userId,
        contextUrl: sessionUrl
      });

      if (data.analysis?.url) {
        setSessionUrl(data.analysis.url);
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: data.response,
        analysis: data.analysis
      }]);

      if (data.reportId) {
        onScanStarted(data.reportId);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: "Error in neural uplink. Command synchronization failed."
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  const handlePinToggle = async () => {
    if (!activeReportId) return;
    try {
      const { data } = await axios.patch(`${API_URL}/report/${activeReportId}/pin`);
      setIsPinned(data.isPinned);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Neural pin toggle failed", err);
    }
  };

  const ActionChip = ({ icon: Icon, label, cmd }) => (
    <button
      onClick={() => handleSend(null, cmd)}
      disabled={isTyping}
      className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 hover:border-primary/40 transition-all active:scale-95 disabled:opacity-30 whitespace-nowrap"
    >
      <Icon size={12} />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full rounded-none md:rounded-[32px] border-x-0 md:border border-eu-glass-border overflow-hidden glass-euphoria shadow-2xl relative transition-all duration-700">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-eu-accent/5 blur-[100px] -z-10" />

      {/* Header */}
      <div className="px-4 md:px-8 py-3 md:py-4 border-b border-eu-glass-border flex items-center justify-between bg-eu-bg-card backdrop-blur-3xl transition-colors duration-700">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-eu-accent/20 rounded-xl flex items-center justify-center border border-eu-accent/20 shadow-neon">
            <Bot className="text-eu-accent size-5 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-[13px] font-black tracking-industrial text-white uppercase premium-gradient-text"></h3>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="size-2 rounded-full bg-eu-accent shadow-[0_0_12px_var(--eu-glow)] animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessionUrl && activeReportId && (
            <>
              <button
                onClick={handlePinToggle}
                className={`px-3 py-2 bg-white/5 border border-white/5 rounded-xl transition-all group ${isPinned ? 'border-eu-accent/30 bg-eu-accent/10 shadow-neon' : 'hover:border-white/20'}`}
                title={isPinned ? "Unpin Session" : "Pin Session"}
              >
                <Pin size={14} className={isPinned ? 'text-eu-accent fill-current' : 'text-slate-500 group-hover:text-slate-300'} />
              </button>
              <button
                onClick={() => onViewFullReport(activeReportId)}
                className="px-4 py-2 bg-eu-accent/10 border border-eu-accent/20 rounded-xl hover:bg-eu-accent/20 transition-all flex items-center gap-2.5 group shadow-neon"
              >
              <Layout size={14} className="text-eu-accent group-hover:rotate-45 transition-transform" />
              <span className="text-[9px] font-black font-mono text-eu-accent uppercase tracking-widest">Full_Report</span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              setSessionUrl(null);
              setMessages([{ id: Date.now(), type: 'ai', text: "Lattice Reset. Provide a New Target Infrastructure URL." }]);
            }}
            className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl hover:bg-red-500/10 hover:border-red-500/20 transition-all group"
            title="Reset Intel"
          >
            <span className="text-[9px] font-black text-slate-500 uppercase group-hover:text-red-400">Reset</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 font-outfit custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[95%] md:max-w-[85%] p-4 md:p-6 rounded-[24px] md:rounded-[32px] text-[13px] md:text-[14px] leading-relaxed relative ${msg.type === 'user'
                  ? 'bg-gradient-to-br from-eu-accent to-euphoria-violet text-white rounded-tr-none shadow-neon border border-white/10'
                  : 'glass-euphoria text-white rounded-tl-none border-eu-accent/10'
                }`}>
                <div className={`flex items-center gap-2.5 mb-2.5 opacity-50 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                  {msg.type === 'user' ? <User size={14} className="text-white" /> : <Cpu size={14} className="text-eu-accent" />}
                  <span className="text-[9px] font-black uppercase tracking-widest font-mono">
                    {msg.type === 'user' ? 'LEXICON_OPERATOR' : 'INTELLIGENCE_NODE'}
                  </span>
                </div>

                <p className={msg.type === 'ai' ? 'font-mono text-sm tracking-tight' : ''}>
                  {msg.analysis?.summary || msg.text}
                </p>

                {/* Service Status Board (Modular) */}
                {msg.recentEvents?.length > 0 && (
                  <div className="mt-4 p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                        <Activity size={10} /> Live_Event_Log
                      </span>
                      <span className="text-[7px] text-slate-700 animate-pulse uppercase">Stream_Active</span>
                    </div>
                    {msg.recentEvents.map((ev, i) => (
                      <div key={i} className="flex gap-3 text-[10px] items-start animate-fade-in">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase tracking-tighter ${ev.type === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                            ev.type === 'ATTACK' ? 'bg-rose-500/10 text-rose-500' :
                              'bg-blue-500/10 text-blue-500'
                          }`}>
                          {ev.type}
                        </span>
                        <span className="text-slate-400 leading-tight">{ev.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Suggested Actions */}
      {sessionUrl && !isTyping && (
        <div className="px-4 md:px-8 py-2 flex gap-4 overflow-x-auto no-scrollbar border-t border-white/5 bg-white/2">
          <ActionChip icon={Bug} label="Chaos Fuzzing" cmd="Run Chaos Agent on current page" />
          <ActionChip icon={Shield} label="Security Check" cmd="Audit security headers and SSL" />
          <ActionChip icon={Zap} label="Full Deep Scan" cmd="Execute full infrastructure diagnostic" />
          <ActionChip icon={Activity} label="Form Validation" cmd="Test all forms with the Smart Agent" />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 md:px-8 py-3 md:py-4 bg-white/2 border-t border-white/5 backdrop-blur-3xl">
        <div className="relative group flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={sessionUrl ? "SYNC_COMMAND_TO_LATTICE..." : "PASTE_TARGET_INFRASTRUCTURE_URL..."}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 text-[12px] font-mono tracking-widest text-white focus:outline-none focus:border-eu-accent/40 focus:bg-white/10 transition-all uppercase placeholder:text-slate-600 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="size-12 bg-eu-accent text-white rounded-2xl shadow-neon hover:scale-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-20 group"
          >
            <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
