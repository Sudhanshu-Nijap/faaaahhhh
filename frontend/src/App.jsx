import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Shield, Bug, Activity, Command, Github, Twitter, Cpu, Layout, Terminal, Lock, Zap, MousePointer2 } from 'lucide-react';
import ScanForm from './components/ScanForm';
import ReportDashboard from './components/ReportDashboard';
import BentoDashboard from './components/BentoDashboard';
import ReportDetail from './components/ReportDetail';
import AuthModal from './components/AuthModal';
import HowItWorks from './components/HowItWorks';
import AboutUs from './components/AboutUs';
import Capabilities from './components/Capabilities';

function App() {
  const [activeReportId, setActiveReportId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleScanStarted = (reportId) => {
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

  const activeReport = activeReportId;

  return (
    <div className="relative min-h-screen selection:bg-primary/30">
        <div className="background-system" />
        <div className="grid-pattern" />
        <div className="noise-overlay" />
        <div className="scanline opacity-20" />
        
        {/* Header */}
        <header className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-neon">
              <Shield className="text-primary size-5" />
            </div>
            <span className="font-outfit font-black text-2xl tracking-tight-mega uppercase premium-gradient-text">Sentinel</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-12 text-[11px] font-black tracking-industrial text-slate-500 uppercase">
            <a href="#about-us" className="hover:text-primary transition-colors cursor-pointer">Security</a>
          </nav>

          <button 
            onClick={() => isLoggedIn ? handleLogout() : setIsAuthOpen(true)}
            className="group relative px-8 py-3 bg-primary/10 border border-primary/30 rounded-full overflow-hidden hover:border-primary transition-all duration-500"
          >
            <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="relative font-outfit font-black text-[10px] tracking-industrial text-primary uppercase group-hover:text-white transition-colors">
              {isLoggedIn ? "Deauthenticate" : "Authenticate"}
            </span>
          </button>
        </header>

        <main className="relative z-10">
          <AnimatePresence mode="wait">
            {activeReportId ? (
              <motion.div 
                key="report-detail"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="fixed inset-0 z-50 bg-background-void/95 backdrop-blur-xl p-6 md:p-12 overflow-y-auto"
              >
                <ReportDetail 
                  reportId={activeReportId} 
                  onBack={() => setActiveReportId(null)} 
                />
              </motion.div>
            ) : !isLoggedIn ? (
              <motion.div 
                key="landing-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-0"
              >
                {/* Hero Section */}
                <section className="relative min-h-screen flex items-center justify-center px-4 pt-32 pb-24 overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-primary/5 rounded-full blur-[180px] -z-10 animate-pulse" />
                  
                  <div className="text-center z-10 max-w-5xl w-full mx-auto px-10">
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex items-center justify-center gap-4 mb-10">
                        <span className="text-[10px] font-black tracking-industrial text-primary/40 uppercase">Security Audit Protocol v1.0</span>
                      </div>
                      
                      <h1 className="font-outfit font-black text-5xl md:text-8xl leading-[0.85] tracking-tight-mega mb-12 premium-gradient-text uppercase">
                        SENTINEL<br/>AI QA
                      </h1>
                      
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-16 opacity-60">
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
                        className="flex items-center justify-center gap-4 bg-primary text-white font-outfit font-black py-6 px-12 rounded-2xl shadow-neon-strong hover:scale-[1.05] transition-all active:scale-95 text-xs uppercase tracking-[0.3em] group"
                      >
                        <Zap size={18} className="animate-pulse group-hover:scale-110 transition-transform" />
                        <span>Authenticate Protocol</span>
                      </button>
                    </div>
                  </div>
                </section>

                <div className="section-divider" />
                
                <section className="py-32 overflow-hidden">
                   <Capabilities />
                </section>

                <div className="section-divider" />
                
                <div id="about-us" className="relative py-48 px-10">
                   <AboutUs />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="pt-32 pb-24 px-6 md:px-12 min-h-screen relative overflow-hidden"
              >
                {/* Dashboard Background Energy */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -z-10 translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px] -z-10 -translate-x-1/2 translate-y-1/2" />

                <div className="max-w-7xl mx-auto">
                    <BentoDashboard 
                      onScanStarted={handleScanStarted} 
                      onSelectReport={setActiveReportId}
                      refreshKey={refreshKey}
                    />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="border-t border-primary/10 py-16 px-6 md:px-20 bg-slate-950">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-primary" size={20} />
              <span className="font-outfit font-bold tracking-[0.2em] text-[10px] uppercase">SENTINEL_PROTOCOL_v4.2</span>
            </div>
            
            <div className="flex gap-12 text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">
              <a href="#" className="hover:text-primary transition-colors">Terminals</a>
              <a href="#" className="hover:text-primary transition-colors">Nodes</a>
              <a href="#" className="hover:text-primary transition-colors">Log_File</a>
              <a href="#" className="hover:text-primary transition-colors">Auth_Check</a>
            </div>
            
            <div className="text-slate-600 text-[10px] font-mono tracking-widest uppercase">
              COPYRIGHT (C) 2026 SENTINEL AI QA. ALL RIGHTS RESERVED.
            </div>
          </div>
        </footer>

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
