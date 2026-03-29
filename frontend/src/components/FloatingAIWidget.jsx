import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Zap, ChevronUp, ChevronDown, Terminal, Lightbulb, Activity, Skull } from 'lucide-react';

const FloatingAIWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [response, setResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    const handleAsk = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        setResponse(null);
        try {
            const { data } = await axios.post('http://localhost:5005/api/learning/ask', { question: input });
            setResponse(data);
            // Don't clear input immediately so they see what they asked
        } catch (error) {
            setResponse({
                explanation: "Neural link severed. Ensure backend telemetry is active.",
                steps: ["Check server status.", "Verify API keys.", "Restart uplink."]
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] font-outfit">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="mb-4 w-[380px] sm:w-[420px] glass-node border border-eu-accent/30 shadow-neon-strong rounded-[32px] overflow-hidden flex flex-col max-h-[600px]"
                    >
                        {/* Header */}
                        <div className="p-5 bg-eu-accent/10 border-b border-eu-accent/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-eu-accent flex items-center justify-center text-white shadow-neon">
                                    <Zap size={18} fill="currentColor" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Debug Oracle</h3>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-eu-accent animate-pulse">Neural Synthesizer Active</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                            {!response && !isLoading && (
                                <div className="text-center py-10 opacity-30">
                                    <MessageSquare size={40} className="mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Command Input...</p>
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="size-10 border-2 border-eu-accent border-t-transparent animate-spin rounded-full shadow-neon" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-eu-accent animate-pulse">Calculating Repair Protocol...</p>
                                </div>
                            )}

                            {response && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-6"
                                >
                                    <section>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                                            <Activity size={12} className="text-eu-accent" /> Insight
                                        </p>
                                        <p className="text-[12px] text-slate-200 leading-relaxed font-medium">
                                            {response.explanation}
                                        </p>
                                    </section>

                                    {response.example && (
                                        <section>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                                                <Terminal size={12} /> Diagnostic Source
                                            </p>
                                            <div className="bg-black/60 border border-white/5 p-4 rounded-2xl overflow-x-auto font-mono text-[11px]">
                                                <pre className="text-eu-accent">{response.example}</pre>
                                            </div>
                                        </section>
                                    )}

                                    {response.steps && (
                                        <section>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                                                <Lightbulb size={12} className="text-eu-accent" /> Debugging Sequence
                                            </p>
                                            <div className="space-y-2">
                                                {response.steps.map((step, i) => (
                                                    <div key={i} className="flex gap-4 p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] text-slate-300 font-medium">
                                                        <span className="text-eu-accent font-black">0{i+1}</span>
                                                        {step}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-[var(--eu-glass-border)] bg-black/20">
                            <form onSubmit={handleAsk} className="relative">
                                <input 
                                    type="text" 
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Describe your error..."
                                    className="w-full bg-[var(--eu-bg-void)] border border-[var(--eu-glass-border)] rounded-2xl py-3.5 pl-5 pr-14 text-xs font-medium text-white outline-none focus:border-eu-accent/50 transition-all shadow-inner"
                                />
                                <button 
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 size-9 bg-eu-accent text-white rounded-xl flex items-center justify-center shadow-neon hover:scale-105 active:scale-95 transition-all ${isLoading ? 'opacity-50' : ''}`}
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`size-14 rounded-full shadow-neon-strong flex items-center justify-center transition-all ${
                    isOpen ? 'bg-white text-black rotate-90' : 'bg-eu-accent text-white'
                }`}
            >
                {isOpen ? <X size={24} /> : <Zap size={24} fill="currentColor" />}
                <div className="absolute inset-x-0 -top-12 flex justify-center pointer-events-none">
                     <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-eu-accent/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[9px] font-black uppercase tracking-widest text-eu-accent">Debug Oracle</span>
                     </div>
                </div>
            </motion.button>
        </div>
    );
};

export default FloatingAIWidget;
