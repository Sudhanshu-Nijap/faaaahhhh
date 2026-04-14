import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Shield, Bug, Activity, Command, Github as GitHubIcon, Twitter, Cpu, Layout, Terminal, Lock, Zap, MousePointer2, Skull, X, Brain, Calendar, Bot } from 'lucide-react';
import axios from 'axios';

import ScanForm from './components/ScanForm';
import ReportDashboard from './components/ReportDashboard';
import BentoDashboard from './components/BentoDashboard';
import ReportDetail from './components/ReportDetail';
import GlobalIntelligence from './components/GlobalIntelligence';
import AuthModal from './components/AuthModal';
import HowItWorks from './components/HowItWorks';
import AboutUs from './components/AboutUs';
import Capabilities from './components/Capabilities';
import LiveFuzzingConsole from './components/LiveFuzzingConsole';
import ChatSidebar from './components/ChatSidebar';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/LoadingScreen';
import Footer from './components/Footer';
import LearningHubPage from './components/LearningHub/LearningHubPage';
import FloatingAIWidget from './components/FloatingAIWidget';
import SchedulingDashboard from './components/SchedulingDashboard';
import AddJobModal from './components/AddJobModal';
import IDEView from './components/IDEView';

function App() {


  const [activeReportId, setActiveReportId] = useState(() => localStorage.getItem('sentinel_active_report') || null);
  const [activeChatId, setActiveChatId] = useState(() => localStorage.getItem('sentinel_active_chat') || null);
  const [showIDE, setShowIDE] = useState(false);

  useEffect(() => {
    if (activeChatId) localStorage.setItem('sentinel_active_chat', activeChatId);
    else localStorage.removeItem('sentinel_active_chat');
  }, [activeChatId]);
  const [viewingReportId, setViewingReportId] = useState(null);
  const [liveReportId, setLiveReportId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [activeView, setActiveView] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [scanProgress, setScanProgress] = useState(null);
  const [alert, setAlert] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [pendingChat, setPendingChat] = useState(null);
  const [scheduleTargetUrl, setScheduleTargetUrl] = useState(null);



  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fetchReports = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5005';
      const { data } = await axios.get(`${API_BASE}/api/reports?userId=${userId}`);
      setReports(data);
    } catch (err) {
      console.error("Failed to sync reports for global intelligence", err);
    }
  };

  const fetchActiveScan = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5005'}/api/scan/active/${userId}`);
      if (data && data._id) {
        setActiveReportId(data._id);
        // REMOVED: setRefreshKey - this caused the infinite loop
      }
    } catch (err) {
      // No active scan, silent skip
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchReports();
      fetchActiveScan();
    }
  }, [isLoggedIn, refreshKey]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleScanStarted = (reportId, chatId) => {
    setLiveReportId(reportId);
    if (chatId) setActiveChatId(chatId);
    setRefreshKey(prev => prev + 1);
  };

  // Initial load of scan progress from cache
  useEffect(() => {
    const cached = localStorage.getItem('sentinel_pending_progress');
    if (cached) {
      try {
        setScanProgress(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem('sentinel_pending_progress');
      }
    }
  }, []);

  const socketRef = useRef(null);

  // 1. Persistent Socket Initialization
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io('http://localhost:5005', {
        reconnectionAttempts: 10
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('[Socket]: Tactical uplink established.');

        // Join specialized rooms
        const userId = localStorage.getItem('userId');
        if (userId) {
          socket.emit('join-user', userId);
          console.log(`[Socket]: Subscribed to global user stream: user_${userId}`);
        }

        const currentLiveId = localStorage.getItem('sentinel_live_report_id');
        if (currentLiveId) {
          socket.emit('join-room', currentLiveId);
        }
      });

      // Global State Synchronizers
      socket.on('report-update', (data) => {
        console.log('[Socket]: Global report update detected:', data);
        setRefreshKey(prev => prev + 1);
      });

      socket.on('thread-update', (data) => {
        console.log('[Socket]: Neural thread update detected:', data);
        setRefreshKey(prev => prev + 1);
      });

      socket.on('scan-progress', (data) => {
        setScanProgress(data);
        localStorage.setItem('sentinel_pending_progress', JSON.stringify(data));

        if (data.status === 'completed' || data.status === 'failed') {
          localStorage.removeItem('sentinel_pending_progress');
          localStorage.removeItem('sentinel_live_report_id');
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setScanProgress(null), 5000);
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // 2. Room Switching Logic
  useEffect(() => {
    if (liveReportId && socketRef.current) {
      localStorage.setItem('sentinel_live_report_id', liveReportId);
      socketRef.current.emit('join-room', liveReportId);
      console.log('[Socket]: Joined active scan room:', liveReportId);
    }
  }, [liveReportId]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setIsAuthOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleReScan = async (url) => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/scan`, {
        url,
        userId,
        force: true
      });
      if (response.data.reportId) {
        handleScanStarted(response.data.reportId);
        setViewingReportId(null);
        setAlert({ type: 'info', message: 'Re-scan initiated. Monitoring neural downlink...' });
      }
    } catch (error) {
      console.error('Re-scan failed', error);
      setAlert({ type: 'error', message: 'Target acquisition failed. Check backend uplink.' });
    }
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const confirm = (options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        ...options,
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        }
      });
    });
  };

  const prompt = (options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        ...options,
        showInput: true,
        onConfirm: (val) => {
          setConfirmModal(null);
          resolve(val);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(null);
        }
      });
    });
  };

  return (
    <div className="relative min-h-screen selection:bg-primary/30 overflow-x-hidden transition-colors duration-700">
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen key="loader" />}
      </AnimatePresence>

      {/* Global Alert System - Top Layer */}
      <AnimatePresence>
        {showIDE && (
          <IDEView key="ide-view" onClose={() => setShowIDE(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed top-24 right-6 z-[9999] p-1 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl border border-[var(--eu-glass-border)]"
          >
            <div className="flex items-center gap-4 px-6 py-4 bg-[var(--eu-bg-void)] relative backdrop-blur-3xl">
              <div className={`size-10 rounded-xl flex items-center justify-center border ${alert.type === 'error' ? 'bg-primary/10 border-primary/30 text-primary' :
                alert.type === 'success' ? 'bg-primary/10 border-primary/30 text-primary' :
                  'bg-primary/10 border-primary/30 text-primary'
                }`}>
                {alert.type === 'error' ? <Bug size={18} /> :
                  alert.type === 'success' ? <ShieldCheck size={18} /> :
                    <Activity size={18} className="animate-pulse" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted font-outfit">Status Uplink</p>
                <p className="text-xs font-bold text-white max-w-[240px] leading-tight mt-0.5">{alert.message}</p>
              </div>
              <button onClick={() => setAlert(null)} className="ml-4 p-1 hover:bg-[var(--eu-bg-void)]/40 rounded-lg text-muted">
                <Command size={14} className="rotate-45" />
              </button>

              <motion.div
                className={`absolute bottom-0 left-0 h-[2px] ${alert.type === 'error' ? 'bg-primary' :
                  alert.type === 'success' ? 'bg-primary' :
                    'bg-primary'
                  }`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 6 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* <div className="dreamy-blob top-[-10%] left-[-10%] animate-dreamy opacity-20" />
      <div className="dreamy-blob bottom-[-10%] right-[-10%] animate-dreamy opacity-10 [animation-delay:4s]" /> */}
      <div className="noise-overlay" />

      {/* Header */}
      <AnimatePresence>
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed z-50 transition-all duration-700 ${isLoggedIn
            ? "top-0 left-0 w-full px-4 py-2 sm:px-6 sm:py-3 bg-[var(--eu-bg-void)] border-b border-[var(--eu-glass-border)]"
            : "top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl px-4 py-3 md:px-8 md:py-4 glass-euphoria border border-[var(--eu-glass-border)] shadow-2xl rounded-[24px] md:rounded-[32px]"
            } flex items-center justify-between`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            {isLoggedIn && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-[var(--eu-bg-void)]/40 rounded-xl transition-colors"
                title="Toggle Sidebar"
              >
                <Command size={18} className="text-primary" />
              </button>
            )}
            <div className={`size-7 sm:size-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 ${!isLoggedIn && 'shadow-neon'}`}>
              <Shield className="text-primary size-3 sm:size-4" />
            </div>
            <a href="#home" className="font-outfit font-black text-base sm:text-xl tracking-tight-mega uppercase premium-gradient-text hover:opacity-80 transition-opacity">Sentinel</a>
          </div>

          {!isLoggedIn && (
            <nav className="hidden lg:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
              {[
                { name: 'Home', href: '#home' },
                { name: 'Features', href: '#capabilities' },
                { name: 'How it works', href: '#how-it-works' },
                { name: 'About us', href: '#about-us' }
              ].map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-[10px] font-black uppercase tracking-[0.25em] text-muted hover:text-eu-accent transition-all relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-eu-accent transition-all group-hover:w-full shadow-neon" />
                </a>
              ))}
            </nav>
          )}

          {isLoggedIn && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-3">
              {[
                { id: 'qa', label: 'CHAT', icon: <Bot size={15} />, title: 'Neural Assistant' },
                { id: 'analyze', label: 'ANALYZE', icon: <Activity size={15} />, title: 'Global Intelligence' },
                { id: 'learn', label: 'LEARN', icon: <Cpu size={15} />, title: 'Cognitive Learning Hub' },
                { id: 'schedule', label: 'SCHEDULE', icon: <Calendar size={15} />, title: 'Neural Scheduler' },
                { id: 'ide', label: 'DEBUG', icon: <Brain size={15} />, title: 'AI Neural Debugger' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    if (v.id === 'ide') {
                      setShowIDE(true);
                      return;
                    }
                    setActiveView(v.id);
                    setViewingReportId(null);
                  }}
                  className={`px-3 py-2 md:px-5 md:py-2.5 rounded-full transition-all border flex items-center gap-2.5 group ${activeView === v.id
                      ? 'bg-primary border-primary text-white shadow-neon scale-105'
                      : 'bg-white/5 border-white/10 text-primary hover:bg-primary/10 hover:border-primary/40'
                    }`}
                  title={v.title}
                >
                  <div className={activeView === v.id ? "animate-pulse" : ""}>{v.icon}</div>
                  <span className="hidden sm:inline text-[9px] font-black tracking-[0.2em]">{v.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-3 bg-[var(--eu-bg-void)]/60 hover:bg-[var(--eu-bg-void)]/80 rounded-2xl transition-all border border-[var(--eu-glass-border)] text-primary"
              title="Toggle Cinematic Mode"
            >
              <Zap size={16} fill={theme === 'dark' ? "currentColor" : "none"} className={theme === 'dark' ? "animate-pulse" : ""} />
            </button>

            {!isLoggedIn && (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="group relative px-6 py-2 bg-primary border border-primary/20 rounded-2xl overflow-hidden hover:scale-105 transition-all shadow-neon"
              >
                <span className="relative font-outfit font-black text-[9px] tracking-industrial text-white uppercase">
                  Auth
                </span>
              </button>
            )}
          </div>
        </motion.header>
      </AnimatePresence>

      <main className="relative z-10 pt-4 md:pt-8 h-full">
        <AnimatePresence mode="wait">
          {!isLoggedIn ? (
            <motion.div
              key="landing-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-0"
            >
              {/* Hero Section */}
              <section id="home" className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden scroll-mt-32">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-primary/5 rounded-full blur-[180px] -z-10 animate-pulse" />

                <div className="text-center z-10 max-w-5xl w-full mx-auto px-10">
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h1 className="font-outfit font-black text-5xl sm:text-7xl md:text-9xl leading-[0.8] tracking-tight-mega mb-12 premium-gradient-text uppercase">
                      SENTINEL<br />AI QA
                    </h1>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 mb-16 opacity-60">
                      <div className="flex items-center gap-3">
                        <Shield className="text-primary" size={12} />
                        <span className="text-[9px] font-black tracking-widest uppercase">Hardened Topology</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Cpu className="text-primary" size={12} />
                        <span className="text-[9px] font-black tracking-widest uppercase">Neural Auditing</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Activity className="text-primary" size={12} />
                        <span className="text-[9px] font-black tracking-widest uppercase">Live Diagnostics</span>
                      </div>
                    </div>
                  </motion.div>

                  <div className="flex justify-center mt-12">
                    <button
                      onClick={() => setIsAuthOpen(true)}
                      className="flex items-center justify-center gap-4 bg-primary text-white font-outfit font-black py-4 sm:py-6 px-8 sm:px-12 rounded-2xl shadow-neon-strong hover:scale-[1.05] transition-all active:scale-95 text-[10px] sm:text-xs uppercase tracking-[0.3em] group"
                    >
                      <Zap size={18} className="animate-pulse group-hover:scale-110 transition-transform" />
                      <span>Authenticate Protocol</span>
                    </button>
                  </div>
                </div>
              </section>

              <section id="capabilities" className="py-6 sm:py-8 scroll-mt-32">
                <Capabilities />
              </section>

              <section id="how-it-works" className="flex items-center justify-center py-6 sm:py-8 scroll-mt-32">
                <HowItWorks />
              </section>




              <div id="about-us" className="relative flex items-center justify-center py-6 sm:py-8 px-4 sm:px-10 scroll-mt-32">
                <AboutUs />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pt-16 md:pt-20 flex overflow-hidden bg-transparent"
            >
              <div
                className={`fixed inset-0 z-[60] bg-black/80 transition-opacity duration-500 lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
              />

              <div className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-500 transform lg:relative lg:translate-x-0 lg:p-4 lg:md:p-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <ChatSidebar
                  onSelectChat={(chatId) => {
                    setActiveChatId(chatId);
                    setActiveView('qa');
                    setViewingReportId(null);
                    setIsSidebarOpen(false);
                  }}
                  onViewReport={(id) => {
                    setViewingReportId(id);
                    setIsSidebarOpen(false);
                  }}
                  activeChatId={activeChatId}
                  onNewSession={() => {
                    setActiveChatId(null);
                    setActiveView('qa');
                    setViewingReportId(null);
                    setIsSidebarOpen(false);
                  }}
                  refreshKey={refreshKey}
                  onToggleTheme={toggleTheme}
                  theme={theme}
                  onGroupChart={() => {
                    setActiveView('analyze');
                    setViewingReportId(null);
                    setIsSidebarOpen(false);
                  }}
                  onScheduleClick={() => {
                    setActiveView('schedule');
                    setViewingReportId(null);
                    setIsSidebarOpen(false);
                  }}
                  onDeleteChat={(id) => {
                    if (activeChatId === id) {
                      setActiveChatId(null);
                      setViewingReportId(null);
                    }
                    if (scanProgress && (scanProgress.chatId === id)) {
                      setScanProgress(null);
                      localStorage.removeItem('sentinel_pending_progress');
                    }
                    setRefreshKey(prev => prev + 1);
                  }}
                  confirm={confirm}
                  prompt={prompt}
                  setAlert={setAlert}
                />
              </div>

              <div className="flex-1 h-full relative p-4 md:p-6 overflow-hidden">
                <AnimatePresence mode="wait">
                  {viewingReportId ? (
                    <motion.div
                      key="report-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="h-full overflow-y-auto custom-scrollbar"
                    >
                      <ReportDetail
                        reportId={viewingReportId}
                        onBack={() => setViewingReportId(null)}
                        onRefresh={() => setRefreshKey(prev => prev + 1)}
                        onReScan={handleReScan}
                        onDeleted={() => {
                          if (activeReportId === viewingReportId) setActiveReportId(null);
                          setRefreshKey(prev => prev + 1);
                          setViewingReportId(null);
                        }}
                        onAskAI={(msg, rId) => {
                          setPendingChat({ message: msg, reportId: rId });
                          setViewingReportId(null);
                          setActiveView('qa');
                        }}
                        confirm={confirm}
                        prompt={prompt}
                        setAlert={setAlert}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat-interface-wrapper"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <ChatInterface
                        key={activeChatId || 'new'}
                        activeChatId={activeChatId}
                        activeView={activeView}
                        onViewChange={setActiveView}
                        onScanStarted={handleScanStarted}
                        onViewFullReport={setViewingReportId}
                        onRefresh={() => setRefreshKey(prev => prev + 1)}
                        onResetTarget={() => { setActiveChatId(null); setActiveView('qa'); }}
                        globalScanProgress={scanProgress}
                        pendingMessage={pendingChat?.message}
                        pendingReportId={pendingChat?.reportId}
                        onMessageConsumed={() => setPendingChat(null)}
                        onChatActivated={setActiveChatId}
                        reports={reports}
                        setAlert={setAlert}
                        confirm={confirm}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Progress Bar (Sticky) */}
      <AnimatePresence>
        {isLoggedIn && scanProgress && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-[100] p-[1px] bg-gradient-to-r from-eu-accent/50 via-white/10 to-transparent rounded-[20px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
          >
            <div className="bg-[var(--eu-bg-card)] p-5 rounded-[19px] border border-[var(--eu-glass-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="size-11 bg-eu-accent/10 rounded-xl flex items-center justify-center border border-eu-accent/20 relative group">
                    <div className="absolute inset-0 bg-eu-accent/20 blur-lg rounded-full animate-pulse group-hover:bg-eu-accent/40 transition-all" />
                    <Activity size={18} className="text-eu-accent animate-[pulse_2s_infinite] relative" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90 font-outfit">Neural Substrate Scan</h4>
                    <p className="text-[10px] font-bold text-eu-accent/80 uppercase tracking-tighter mt-1 flex items-center gap-2">
                      <span className="inline-block size-1 bg-eu-accent rounded-full animate-ping" />
                      {scanProgress.stage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-lg font-black font-mono text-white tracking-tighter leading-none">{scanProgress.percent}%</div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Completion</div>
                  </div>

                  <button
                    onClick={() => {
                      setScanProgress(null);
                      localStorage.removeItem('sentinel_pending_progress');
                      window.location.reload();
                    }}
                    className="size-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all shadow-sm"
                    title="Dismiss Progress Monitor"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="relative w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-[1px] border border-white/10 shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-eu-accent via-violet-500 to-cyan-400 relative"
                  initial={{ width: '0%' }}
                  animate={{ width: `${scanProgress.percent}%` }}
                  transition={{ duration: 0.8, ease: "circOut" }}
                >
                  {/* Premium Shimmer Effect */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full"
                  />
                  {/* Subtle Glow */}
                  <div className="absolute inset-0 shadow-[0_0_15px_rgba(var(--eu-accent-rgb),0.5)]" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoggedIn && <Footer />}

      {/* Global Confirm/Prompt Modal - Refined to 'Popup' style */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 glass-overlay"
          >
            <motion.div
              initial={{ scale: 0.8, y: -20, opacity: 0, rotateX: 10 }}
              animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, y: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[380px] glass-modal p-6 rounded-[28px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                <Command size={80} className="text-eu-accent" />
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className={`size-11 rounded-xl flex items-center justify-center border shadow-neon ${confirmModal.type === 'danger' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-eu-accent/10 border-eu-accent/20 text-eu-accent'
                  }`}>
                  {confirmModal.type === 'danger' ? <Skull size={20} /> : <Zap size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-[var(--eu-text-main)] font-outfit leading-none">{confirmModal.title || 'Uplink Request'}</h3>
                  <p className="text-[8px] font-black text-[var(--eu-text-main)] opacity-40 uppercase tracking-widest font-outfit mt-1">Status: Restricted Access</p>
                </div>
              </div>

              <p className="text-slate-400 text-[13px] leading-relaxed font-medium mb-6">
                {confirmModal.message}
              </p>

              {confirmModal.showInput && (
                <div className="mb-8">
                  <input
                    id="modal-pixel-input"
                    type="text"
                    autoFocus
                    placeholder="Enter uplink parameters..."
                    className="w-full bg-[var(--eu-bg-void)] border border-[var(--eu-glass-border)] rounded-xl px-4 py-3 text-[var(--eu-text-main)] text-sm outline-none focus:border-eu-accent/50 transition-all font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmModal.onConfirm(e.currentTarget.value);
                    }}
                  />
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={confirmModal.onCancel}
                  className="flex-1 py-3 bg-[var(--eu-bg-void)]/40 hover:bg-[var(--eu-bg-void)]/60 border border-[var(--eu-glass-border)] rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--eu-text-main)] opacity-40 transition-all font-outfit"
                >
                  Abort
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('modal-pixel-input');
                    confirmModal.onConfirm(input ? input.value : true);
                  }}
                  className={`flex-1 py-3 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-neon font-outfit ${confirmModal.type === 'danger' ? 'bg-primary hover:bg-primary/80' : 'bg-eu-accent hover:bg-eu-accent/80'
                    }`}
                >
                  {confirmModal.confirmText || 'Authorize'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {liveReportId && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-12 bg-[var(--eu-bg-overlay-modal)] backdrop-blur-md"
          >
            <div className="w-full max-w-4xl h-[80vh] relative">
              <LiveFuzzingConsole reportId={liveReportId} />
              <button
                onClick={() => setLiveReportId(null)}
                className="absolute -top-12 right-0 px-6 py-2 bg-[var(--eu-bg-void)]/60 hover:bg-[var(--eu-bg-void)]/80 border border-[var(--eu-glass-border)] rounded-full text-[10px] font-black uppercase tracking-widest text-[var(--eu-text-main)] opacity-80 transition-all"
              >
                Close Live Console
              </button>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      <AnimatePresence>
        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onLogin={handleLogin}
            onAuthSuccess={handleLogin}
          />
        )}
      </AnimatePresence>
      {isLoggedIn && activeView === 'learn' && <FloatingAIWidget />}

      <AnimatePresence>
        {scheduleTargetUrl && (
          <AddJobModal
            isOpen={!!scheduleTargetUrl}
            onClose={() => setScheduleTargetUrl(null)}
            initialUrl={scheduleTargetUrl}
            setAlert={setAlert}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
