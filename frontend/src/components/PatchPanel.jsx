import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCommit, X, Cpu, GitPullRequest, ShieldAlert, FileText, Zap, ChevronRight } from 'lucide-react';

const PatchPanel = ({ file, onRejectPatch }) => {
  if (!file) return null;

  return (
    <div className="flex flex-col h-full !bg-white border-l border-slate-200 w-full relative overflow-hidden font-outfit select-none shadow-2xl z-50">
        {/* --- Branded Sentinel Header --- */}
        <div className="p-5 border-b border-slate-100 !bg-white flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
                <div className="size-10 bg-[#ff007a] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Zap size={22} fill="currentColor" />
                </div>
                <div>
                   <h3 className="text-[14px] font-black text-black uppercase tracking-widest leading-none">Neural Registry</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{file.name}</p>
                </div>
            </div>
            <div className="bg-[#ff007a]/10 border border-[#ff007a]/20 px-3 py-1.5 rounded-full">
                <span className="text-[10px] font-black text-[#ff007a] uppercase tracking-tighter">
                    {file.patches?.length || 0} Detections
                </span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar relative p-5 space-y-6 bg-slate-50/20">
            <AnimatePresence mode="popLayout">
                {file.patches && file.patches.length > 0 ? (
                    file.patches.map((patch, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="border border-slate-200 rounded-[28px] overflow-hidden !bg-white shadow-xl hover:border-[#ff007a]/30 transition-all duration-300"
                        >
                            {/* Card Diagnostic Context */}
                            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="size-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                                        <GitCommit size={14} strokeWidth={3} />
                                    </div>
                                    <span className="text-[12px] font-black text-[#ff007a] italic truncate pr-4">
                                        "{patch.comment || patch.reason || 'Code Audit'}"
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex-none">
                                        {patch.type === 'unified' ? 'Logic' : `Line ${patch.line}`}
                                    </span>
                                    <button 
                                        onClick={() => onRejectPatch(patch)}
                                        className="size-7 rounded-xl bg-white hover:bg-[#ff007a] text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-100 shadow-sm"
                                    >
                                        <X size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            {/* Proper Red/Green Diff Substrate */}
                            <div className="bg-white font-mono text-[11px] py-0 leading-tight">
                                {patch.type === 'unified' ? (
                                    <div className="py-2">
                                        {patch.content.split('\n').map((line, lIdx) => {
                                            const isAdd = line.startsWith('+');
                                            const isDel = line.startsWith('-');
                                            return (
                                                <div 
                                                    key={lIdx} 
                                                    className={`flex w-full ${isAdd ? 'bg-[#dafbe1] text-[#1a7f37]' : isDel ? 'bg-[#ffebe9] text-[#cf222e]' : 'text-slate-300'}`}
                                                >
                                                    <div className={`w-10 flex-none text-right pr-3 select-none border-r ${isAdd ? 'border-[#1a7f37]/10' : isDel ? 'border-[#cf222e]/10' : 'border-slate-50'} opacity-30`}>
                                                        {lIdx + 1}
                                                    </div>
                                                    <div className={`px-4 py-1 whitespace-pre-wrap break-all ${isAdd || isDel ? 'font-bold' : ''}`}>
                                                        {line}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-0">
                                        <div className="flex bg-[#ffebe9] text-[#cf222e] py-3 leading-tight border-b border-slate-50 group/line">
                                            <div className="w-10 flex-none text-right pr-3 select-none border-r border-[#cf222e]/10 opacity-30">
                                                {patch.line}
                                            </div>
                                            <div className="px-4 truncate font-bold italic">
                                                - {patch.old || '...'}
                                            </div>
                                        </div>
                                        <div className="flex bg-[#dafbe1] text-[#1a7f37] py-3 leading-tight shadow-inner">
                                            <div className="w-10 flex-none text-right pr-3 select-none border-r border-[#1a7f37]/10 opacity-30">
                                                {patch.line}
                                            </div>
                                            <div className="px-4 font-bold truncate">
                                                + {patch.new || '...'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 opacity-10 text-center space-y-4">
                        <ShieldAlert size={48} className="text-[#ff007a]" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Stable Substrate</p>
                    </div>
                )}
            </AnimatePresence>
        </div>

        {/* --- Branded Monitoring Bar --- */}
        <div className="p-4 bg-white border-t border-slate-100 mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center px-1 mb-2">
                <div className="flex items-center gap-3">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Substrate Integrity</span>
                     <span className="text-[16px] font-black text-black leading-none">{file.confidence || '100%'}</span>
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-black text-[#ff007a]/40 uppercase tracking-widest leading-none">Pulse Active</span>
                </div>
            </div>
            <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden relative border border-slate-100 shadow-inner">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: file.confidence || '100%' }}
                    className="h-full bg-gradient-to-r from-[#ff007a] to-[#ff007a]/40 shadow-[0_0_15px_rgba(255,0,122,0.1)]"
                />
            </div>
        </div>
    </div>
  );
};

export default PatchPanel;
;
