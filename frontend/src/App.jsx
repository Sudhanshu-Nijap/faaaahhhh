import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Shield, Bug, Activity, Command, Github as GitHubIcon, Twitter, Cpu, Layout, Terminal, Lock, Zap, MousePointer2 } from 'lucide-react';
import ScanForm from './components/ScanForm';
import ReportDashboard from './components/ReportDashboard';
import BentoDashboard from './components/BentoDashboard';
import ReportDetail from './components/ReportDetail';
import AuthModal from './components/AuthModal';
import HowItWorks from './components/HowItWorks';
import AboutUs from './components/AboutUs';
import Capabilities from './components/Capabilities';
import LiveFuzzingConsole from './components/LiveFuzzingConsole';
import ChatSidebar from './components/ChatSidebar';
import ChatInterface from './components/ChatInterface';

import Footer from './components/Footer';

function App() {
  const [activeReportId, setActiveReportId] = useState(null);
  const [viewingReportId, setViewingReportId] = useState(null);
  const [liveReportId, setLiveReportId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showReportList, setShowReportList] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Also set Tailwind dark class for dark: prefixes (used by Euphoria menu)
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

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleScanStarted = (reportId) => {
    setLiveReportId(reportId);
    setRefreshKey(prev => prev + 1);
  };

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


  return (
    <div className="relative min-h-screen selection:bg-primary/30 overflow-x-hidden transition-colors duration-700">
      <div className="background-system" />
      <div className="dreamy-blob top-[-10%] left-[-10%] animate-dreamy opacity-20" />
      <div className="dreamy-blob bottom-[-10%] right-[-10%] animate-dreamy opacity-10 [animation-delay:4s]" />
      <div className="noise-overlay" />

      {/* Header */}
      <AnimatePresence>
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed z-50 transition-all duration-700 ${
            isLoggedIn 
              ? "top-0 left-0 w-full px-4 py-2 sm:px-6 sm:py-3 bg-background-void/80 backdrop-blur-xl border-b border-white/5" 
              : "top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl px-4 py-3 md:px-8 md:py-4 glass-euphoria border border-white/10 shadow-2xl rounded-[24px] md:rounded-[32px]"
          } flex items-center justify-between`}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            {isLoggedIn && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"
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
                  className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-eu-accent transition-all relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-eu-accent transition-all group-hover:w-full shadow-neon" />
                </a>
              ))}
            </nav>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-primary"
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

      <main className="relative z-10 pt-4 md:pt-8">
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
              <section id="home" className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
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
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-300">Hardened Topology</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Cpu className="text-primary" size={12} />
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-300">Neural Auditing</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Activity className="text-primary" size={12} />
                        <span className="text-[9px] font-black tracking-widest uppercase text-slate-300">Live Diagnostics</span>
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

              <section id="capabilities" className="py-12">
                <Capabilities />
              </section>

              <section id="how-it-works" className="flex items-center justify-center py-12 bg-slate-900/10">
                <HowItWorks />
              </section>

              <div id="about-us" className="relative flex items-center justify-center py-12 px-10">
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
              {/* Persistent Sidebar / Mobile Drawer */}
              <div 
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-500 lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setIsSidebarOpen(false)}
              />
              
              <div className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-500 transform lg:relative lg:translate-x-0 lg:p-4 lg:md:p-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <ChatSidebar
                  onSelectSession={(id) => {
                    setActiveReportId(id);
                    setViewingReportId(id);
                    setShowReportList(false);
                    setIsSidebarOpen(false);
                  }}
                  activeReportId={activeReportId}
                  onNewSession={() => {
                    setActiveReportId(null);
                    setViewingReportId(null);
                    setIsSidebarOpen(false);
                  }}
                  refreshKey={refreshKey}
                  onToggleTheme={toggleTheme}
                  theme={theme}
                  onGroupChart={() => { setShowReportList(true); setIsSidebarOpen(false); }}
                />
              </div>

              {/* Main Workspace (Modular) */}
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
                      />
                    </motion.div>
                  ) : showReportList ? (
                    <motion.div
                      key="lattice-view"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="h-full overflow-y-auto custom-scrollbar"
                    >
                      <div className="mb-8">
                        <button 
                          onClick={() => setShowReportList(false)}
                          className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-eu-accent transition-all"
                        >
                          ← Return to Neural Chat
                        </button>
                      </div>
                      <ReportDashboard 
                        onSelectReport={(id) => { setActiveReportId(id); setShowReportList(false); }}
                        refreshKey={refreshKey}
                        theme={theme}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="h-full"
                    >
                      <ChatInterface
                        activeReportId={activeReportId}
                        onScanStarted={(id) => {
                          handleScanStarted(id);
                        }}
                        onViewFullReport={setViewingReportId}
                        onRefresh={() => setRefreshKey(prev => prev + 1)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!isLoggedIn && <Footer />}

      {liveReportId && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-12 bg-slate-950/80 backdrop-blur-md"
          >
            <div className="w-full max-w-4xl h-[80vh] relative">
              <LiveFuzzingConsole reportId={liveReportId} />
              <button
                onClick={() => setLiveReportId(null)}
                className="absolute -top-12 right-0 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all"
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
    </div>
  );
}

export default App;
