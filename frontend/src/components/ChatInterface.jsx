import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Shield, Zap, Sparkles, MessageSquare, Plus, Activity, Terminal, Lock, Globe, Command, Trash2, ChevronUp, Check } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatInterface = ({ activeReportId, onScanStarted, onViewFullReport, onRefresh, onResetTarget, globalScanProgress, pendingMessage, onMessageConsumed }) => {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('sentinel_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem('sentinel_chat_messages', JSON.stringify(messages));
  }, [messages, isTyping]);

  const prevActiveIdRef = useRef(activeReportId);

  useEffect(() => {
    if (activeReportId) {
      loadReportData(activeReportId);
    } else {
      setReportData(null);
      // If we just transitioned from an active report to null (New Session clicked)
      // OR if there are no messages at all, show welcome
      if (prevActiveIdRef.current !== null || messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'ai',
          content: "NEURAL LATTICE ONLINE. STANDING BY FOR TARGET ACQUISITION. \n\nProvide an Infrastructure URL to:\n- INITIATE CORE QA AUDIT\n- CAPTURE HIGH-FIDELITY SCREENSHOTS\n- ANALYZE PERFORMANCE & ACCESSIBILITY\n\nThe Hub is optimized for speed and visual diagnostics.",
          timestamp: new Date().toLocaleTimeString()
        }]);
        localStorage.removeItem('sentinel_chat_messages');
      }
    }
    prevActiveIdRef.current = activeReportId;
  }, [activeReportId]);

  // Handle pending messages from report view
  useEffect(() => {
    if (pendingMessage && !isTyping) {
       handleSend(null, pendingMessage);
       if (onMessageConsumed) onMessageConsumed();
    }
  }, [pendingMessage, isTyping]);

  const loadReportData = async (id) => {
    setLoading(true);
    setSessionError(null);
    try {
      const { data } = await axios.get(`http://localhost:5000/api/report/${id}`);
      setReportData(data);

      const history = data.chatHistory || [];
      const formattedHistory = history.map((msg, index) => ({
          id: `hist-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toLocaleTimeString()
      }));

      setMessages(prev => {
        if (formattedHistory.length > 0) return formattedHistory;
        
        return [{
          id: 'welcome-report',
          role: 'ai',
          content: `Target Acquisition Successful: ${new URL(data.url).hostname}. Neural analysis is complete. How should we proceed with the findings?`,
          timestamp: new Date().toLocaleTimeString()
        }];
      });
    } catch (err) {
      console.error("Failed to load report", err);
      setSessionError("Neural Link Severed: Failed to synchronize with report metadata.");
    } finally {
      setLoading(false);
    }
  };

  const [showSensors, setShowSensors] = useState(false);
  const [scanParams, setScanParams] = useState(() => {
    try {
      return saved ? JSON.parse(saved) : { scope: 'single', mode: 'specific', tests: ['console', 'network', 'lighthouse', 'accessibility', 'links'] };
    } catch { return { scope: 'single', mode: 'specific', tests: ['console', 'network', 'lighthouse', 'accessibility', 'links'] }; }
  });

  useEffect(() => {
    localStorage.setItem('sentinel_scan_params', JSON.stringify(scanParams));
  }, [scanParams]);

  const toggleTest = (test) => {
    setScanParams(prev => ({
      ...prev,
      tests: prev.tests.includes(test)
        ? prev.tests.filter(t => t !== test)
        : [...prev.tests, test]
    }));
  };

  const normalizeUrl = (input) => {
    let trimmed = input.trim();
    if (!trimmed) return "";
    if (!/^(https?:\/\/)/i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  };

  const validateUrl = (urlToTest) => {
    try {
      const pattern = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
      if (!pattern.test(urlToTest)) return false;
      const parsed = new URL(urlToTest);
      return !!parsed.hostname && parsed.hostname.includes('.');
    } catch {
      return false;
    }
  };

  const handleSend = async (e, manualInput = null) => {
    if (e) e.preventDefault();
    const finalInput = manualInput || input;
    if (!finalInput.trim() || isTyping) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: finalInput,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!manualInput) setInput('');
    setIsTyping(true);

    try {
      // If no active report, treat input as URL for new scan
      if (!activeReportId) {
        const targetUrl = normalizeUrl(finalInput);
        if (!validateUrl(targetUrl)) {
          setMessages(prev => [...prev, {
            id: 'err-val-' + Date.now(),
            role: 'ai',
            content: "Invalid format detected. Target must be a valid domain string (e.g., example.com). Refusing linkage.",
            timestamp: new Date().toLocaleTimeString(),
            isError: true
          }]);
          setIsTyping(false);
          return;
        }

        setMessages(prev => [...prev, {
          id: 'url-capture-' + Date.now(),
          role: 'ai',
          content: `Initializing Protocol: ${scanParams.mode === 'full' ? 'FULL_AUDIT' : scanParams.scope === 'single' ? 'EXPRESS_DIAGNOSTIC' : 'TARGETED_CRAWL'} for ${targetUrl}. Tests: ${scanParams.tests.join(', ')}.`,
          timestamp: new Date().toLocaleTimeString()
        }]);

        const userId = localStorage.getItem('userId');
        const response = await axios.post('http://localhost:5000/api/scan', {
          url: targetUrl,
          userId,
          scope: scanParams.scope,
          mode: scanParams.mode,
          tests: scanParams.tests,
          force: true
        });

        if (response.data.reportId) {
          onScanStarted(response.data.reportId);
        }
      } else {
        // Chat about active report
        const { data } = await axios.post('http://localhost:5000/api/chat', {
          message: finalInput,
          reportId: activeReportId
        });

        const aiMsg = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'ai',
        content: "Neural interference detected. Uplink failed. Please verify the target parameters or check the host connectivity.",
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const WelcomeHero = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[500px] max-w-lg mx-auto text-center space-y-8 py-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-neon relative overflow-hidden"
      >
        <Shield className="text-primary size-6 relative z-10" />
        <motion.div
          animate={{ y: [-30, 30] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-x-0 h-1 bg-primary/40 blur-sm"
        />
      </motion.div>

      <div className="space-y-1">
        <h1 className="text-lg font-black uppercase tracking-tighter text-[var(--eu-text-main)] italic leading-none">
          Neural Lattice Active
        </h1>
        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-primary opacity-40">
          Uplink established // Standing By
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="p-3 bg-[var(--eu-bg-card)] border border-[var(--eu-glass-border)] rounded-xl text-left hover:border-primary/30 transition-all cursor-default group">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={12} className="text-primary/60 group-hover:text-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-main)]">Console/Net</span>
          </div>
          <p className="text-[7px] text-[var(--eu-text-main)] opacity-30 font-mono uppercase tracking-tighter">Diagnostic</p>
        </div>
        <div className="p-3 bg-[var(--eu-bg-card)] border border-[var(--eu-glass-border)] rounded-xl text-left hover:border-primary/30 transition-all cursor-default group">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={12} className="text-primary/60 group-hover:text-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-main)]">Accessibility</span>
          </div>
          <p className="text-[7px] text-[var(--eu-text-main)] opacity-30 font-mono uppercase tracking-tighter">Neural Audit</p>
        </div>
        <div className="p-3 bg-[var(--eu-bg-card)] border border-[var(--eu-glass-border)] rounded-xl text-left hover:border-primary/30 transition-all cursor-default group">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={12} className="text-primary/60 group-hover:text-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-main)]">UI Layout</span>
          </div>
          <p className="text-[7px] text-[var(--eu-text-main)] opacity-30 font-mono uppercase tracking-tighter">Visual QA</p>
        </div>
        <div className="p-3 bg-[var(--eu-bg-card)] border border-[var(--eu-glass-border)] rounded-xl text-left hover:border-primary/30 transition-all cursor-default group">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-primary/60 group-hover:text-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-main)]">Screenshots</span>
          </div>
          <p className="text-[7px] text-[var(--eu-text-main)] opacity-30 font-mono uppercase tracking-tighter">Optic Capture</p>
        </div>
      </div>

      <p className="text-[8px] text-[var(--eu-text-main)] opacity-20 font-mono max-w-xs mx-auto uppercase tracking-widest font-black">
        Input infrastructure parameters below to initiate tactical acquisition.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col h-full glass-node relative font-inter">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--eu-glass-border)] flex items-center justify-between z-10 bg-[var(--eu-bg-void)]">
        <div className="p-2 border border-[var(--eu-glass-border)] rounded-xl bg-[var(--eu-bg-void)] shadow-sm flex items-center justify-center">
          <Bot size={20} className="text-[var(--eu-text-main)] opacity-70" />
        </div>
        <div className="flex items-center gap-3">
          {activeReportId && (
            <button
              onClick={() => onViewFullReport(activeReportId)}
              className="px-5 py-1.5 bg-[var(--eu-bg-void)] hover:bg-[var(--eu-hover-bg)] border border-[var(--eu-glass-border)] rounded-lg text-[10px] font-black uppercase tracking-widest text-eu-accent opacity-80 transition-all active:scale-95"
            >
              View Report
            </button>
          )}
          <button
            onClick={onResetTarget}
            className="px-5 py-1.5 bg-[var(--eu-bg-void)] hover:bg-[var(--eu-hover-bg)] border border-[var(--eu-glass-border)] rounded-lg text-[10px] font-black uppercase tracking-widest text-[var(--eu-text-main)] opacity-80 transition-all active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 custom-scrollbar z-10 bg-[var(--eu-bg-void)]">
        {messages.length <= 1 && !activeReportId ? (
          <WelcomeHero />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col gap-1.5 max-w-[95%] sm:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 px-1">
                    {msg.role === 'ai' ? (
                      <Bot size={11} className="text-[var(--eu-text-main)] opacity-40" />
                    ) : (
                      <User size={11} className="text-[var(--eu-text-main)] opacity-40" />
                    )}
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--eu-text-main)] opacity-30 font-outfit">
                      {msg.role === 'ai' ? 'INTELLIGENCE_NODE' : 'LEXICON_OPERATOR'}
                    </span>
                  </div>

                  <div className={`p-3 sm:p-4 rounded-[18px] border border-[var(--eu-glass-border)] transition-shadow duration-300 ${msg.role === 'user'
                    ? 'bg-[var(--eu-bg-card)] rounded-tr-lg shadow-sm border-primary/20'
                    : 'bg-[var(--eu-bg-card)] rounded-tl-lg shadow-sm'
                    }`}>
                    {msg.isError && <Lock className="inline-block mr-2 text-primary" size={10} />}
                    {msg.role === 'ai' ? (
                      <div className="text-[11px] leading-relaxed text-[var(--eu-text-main)] opacity-90 font-normal prose prose-invert prose-p:my-1 prose-pre:my-2 prose-pre:bg-black/40 prose-pre:p-2 prose-pre:rounded-lg max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[11px] leading-snug text-[var(--eu-text-main)] opacity-80 font-normal">{msg.content}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 p-3 bg-[var(--eu-bg-card)] rounded-xl border border-[var(--eu-glass-border)]">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="size-1.5 bg-primary rounded-full"
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer / Input */}
      <div className="p-3 sm:p-5 bg-[var(--eu-bg-void)] z-10 border-t border-[var(--eu-glass-border)]">
        <div className="max-w-5xl mx-auto mb-4 space-y-4 px-2 relative">
          {!activeReportId && (
            <div className="flex flex-col gap-3 relative">
              {/* Row 1: Scope & Mode */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setScanParams(p => ({ ...p, scope: 'single' }))}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${scanParams.scope === 'single' ? 'bg-primary text-white shadow-neon' : 'text-[var(--eu-text-muted)] hover:text-[var(--eu-text-main)]'
                      }`}
                  >
                    Single Page
                  </button>
                  <button
                    onClick={() => setScanParams(p => ({ ...p, scope: 'site' }))}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${scanParams.scope === 'site' ? 'bg-primary text-white shadow-neon' : 'text-[var(--eu-text-muted)] hover:text-[var(--eu-text-main)]'
                      }`}
                  >
                    Full Site
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setScanParams(p => ({ ...p, mode: 'specific' }))}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${scanParams.mode === 'specific' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[var(--eu-text-muted)] hover:text-[var(--eu-text-main)]'
                      }`}
                  >
                    Specific
                  </button>
                  <button
                    onClick={() => { setScanParams(p => ({ ...p, mode: 'full' })); setShowSensors(false); }}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${scanParams.mode === 'full' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-[var(--eu-text-muted)] hover:text-[var(--eu-text-main)]'
                      }`}
                  >
                    Full Audit
                  </button>
                </div>
                {scanParams.mode === 'specific' && (
                  <button
                    onClick={() => setShowSensors(!showSensors)}
                    className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-neon ${showSensors ? 'bg-primary border border-primary text-[var(--eu-bg-card)]' : 'bg-[var(--eu-bg-void)] border border-white/10 text-primary hover:bg-white/5'}`}
                  >
                    Configure Sensors ({scanParams.tests.length})
                    <ChevronUp size={12} className={`transition-transform duration-300 ${showSensors ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Row 2: Tests Dropdown */}
              <AnimatePresence>
                {scanParams.mode === 'specific' && showSensors && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="absolute bottom-full mb-4 left-0 right-0 p-5 bg-[var(--eu-bg-card)] border border-[var(--eu-glass-border)] rounded-2xl shadow-2xl z-50 glass-modal transform origin-bottom"
                  >
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--eu-text-main)]">Active Neural Sensors</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setScanParams(p => ({ ...p, tests: ['console', 'network', 'forms', 'ui', 'lighthouse', 'accessibility', 'links'] }))}
                          className="px-2 py-1 rounded-md bg-white/5 text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-main)] hover:bg-primary/20 hover:text-primary transition-colors border border-white/5"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setScanParams(p => ({ ...p, tests: [] }))}
                          className="px-2 py-1 rounded-md bg-white/5 text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-muted)] hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                        >
                          Clear
                        </button>
                        <button onClick={() => setShowSensors(false)} className="text-[var(--eu-text-muted)] hover:text-primary transition-colors p-1 ml-1"><Plus size={14} className="rotate-45" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {['console', 'network', 'forms', 'ui', 'lighthouse', 'accessibility', 'links'].map(test => {
                        const labelMap = {
                          'console': 'Console Logs',
                          'network': 'Network Health',
                          'forms': 'Basic Forms',
                          'ui': 'UI/UX Layout',
                          'lighthouse': 'Lighthouse (SEO/Perf)',
                          'accessibility': 'Accessibility',
                          'links': 'Broken Links'
                        };
                        const isActive = scanParams.tests.includes(test);
                        return (
                          <button
                            key={test}
                            onClick={() => toggleTest(test)}
                            className={`flex items-center justify-between p-3 rounded-xl transition-all border group ${isActive
                              ? 'bg-primary/10 text-primary border-primary/30 shadow-neon-small ring-1 ring-primary/20'
                              : 'bg-white/5 text-[var(--eu-text-muted)] border-transparent hover:border-white/10 hover:bg-white/10'
                              }`}
                          >
                            <span className={`text-[9px] font-black uppercase tracking-widest text-left leading-tight ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                              {labelMap[test] || test.replace('_', ' ')}
                            </span>
                            <div className={`size-3 shrink-0 rounded-full border flex items-center justify-center transition-colors ${isActive ? 'bg-primary border-primary text-[var(--eu-bg-card)]' : 'border-[var(--eu-text-muted)] opacity-30 group-hover:border-[var(--eu-text-main)] group-hover:opacity-60'}`}>
                              {isActive && <Check size={8} strokeWidth={4} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div className="flex items-center gap-2 opacity-30">
            <Activity size={10} className="text-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--eu-text-main)]">
              Tactical Config: {scanParams.mode === 'full' ? 'DEEP_SPECTRUM' : `${scanParams.scope.toUpperCase()}_${scanParams.tests.length}_MODULES`}
            </span>
          </div>
        </div>

        <form onSubmit={handleSend} className="relative max-w-5xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="PASTE_TARGET_INFRASTRUCTURE_URL..."
            className="w-full bg-[var(--eu-bg-card)] border-none rounded-xl py-3 px-6 text-[10px] text-[var(--eu-text-main)] focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-[var(--eu-text-main)] placeholder:opacity-20 font-outfit uppercase tracking-widest font-black"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className={`absolute right-6 top-1/2 -translate-y-1/2 p-2 transition-all ${input.trim() && !isTyping
              ? 'text-primary hover:scale-110'
              : 'text-[var(--eu-text-main)] opacity-10'
              }`}
          >
            <Send size={22} className="rotate-0" />
          </button>
        </form>
      </div>
    </div>

  );
};

export default ChatInterface;
