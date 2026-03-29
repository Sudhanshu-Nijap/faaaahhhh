import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Folder, Cpu, Zap, X, Terminal, Code, AlertTriangle, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import PatchPanel from './PatchPanel';

const IDEView = ({ onClose }) => {
    const [path, setPath] = useState('');
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState(null);
    const [deploying, setDeploying] = useState(false);
 
    const API_DEBUG_URL = 'http://localhost:5005/neural-debug-engine-v1';

    const handleRunDebug = async (e) => {
        e.preventDefault();
        if (!path.trim()) return;

        setScanning(true);
        setError(null);
        try {
            const { data } = await axios.post(`${API_DEBUG_URL}-run`, { folderPath: path });
            if (data.status === 'error') {
                setError(data.error);
                setFiles([]);
            } else {
                setFiles(data.files || []);
                if (data.files?.length > 0) setSelectedFile(data.files[0]);
            }
        } catch (err) {
            console.error('[IDE]: Neural Scan Failed:', err);
            setError(err.response?.data?.error || 'System neural substrate failure detected.');
        } finally {
            setScanning(false);
        }
    };

    const handleAcceptPatch = async (file, patch) => {
        setDeploying(true);
        try {
            const { data } = await axios.post(`${API_DEBUG_URL}-patch`, {
                filePath: file.path,
                patch: patch
            });
            if (data.status === 'error') throw new Error(data.error);
            
            // --- Neural State Injection ---
            const fixedContent = data.updatedContent || file.content; // Fallback or memory skip
            
            const updatedFile = { 
                ...file, 
                content: fixedContent,
                patches: file.patches.filter(p => p !== patch) 
            };

            setFiles(prev => prev.map(f => f.path === file.path ? updatedFile : f));
            if (selectedFile?.path === file.path) setSelectedFile(updatedFile);

            setError(null);
            console.log(`[IDE]: Patch deployed to ${file.name}`);
        } catch (err) {
            setError('Deployment Fault: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeploying(false);
        }
    };

    const handleRejectPatch = (file, patch) => {
        setFiles(prev => prev.map(f => {
            if (f.path === file.path) {
                return { ...f, patches: f.patches.filter(p => p !== patch) };
            }
            return f;
        }));
        if (selectedFile?.path === file.path) {
            setSelectedFile(prev => ({ ...prev, patches: prev.patches.filter(p => p !== patch) }));
        }
    };

    const handleDeployAll = async (file) => {
        if (!file.patches || file.patches.length === 0) return;
        setDeploying(true);
        try {
            const { data } = await axios.post(`${API_DEBUG_URL}-deploy-all`, {
                filePath: file.path,
                patches: file.patches
            });
            if (data.status === 'error') throw new Error(data.error);

            // --- Neural Batch State Injection ---
            const fixedContent = data.updatedContent || file.content;
            const updatedFile = { ...file, content: fixedContent, patches: [] };

            setFiles(prev => prev.map(f => f.path === file.path ? updatedFile : f));
            if (selectedFile?.path === file.path) setSelectedFile(updatedFile);

            setError(null);
            console.log(`[IDE]: All patches deployed to ${file.name}`);
        } catch (err) {
            setError('Deployment Fault: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeploying(false);
        }
    };

    const handleFolderUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setScanning(true);
        setError(null);
        
        try {
            const auditBatch = [];
            const supportedExts = ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json'];

            // Filter for supported source artifacts
            const sourceFiles = selectedFiles.filter(f => 
                supportedExts.some(ext => f.name.toLowerCase().endsWith(ext))
            );

            if (sourceFiles.length === 0) {
                setError('No valid source artifacts detected in selected folder.');
                setScanning(false);
                return;
            }

            // Read all files sequentially (tactical limit for performance)
            for (const file of sourceFiles.slice(0, 20)) {
                const content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target.result);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
                auditBatch.push({ name: file.name, content });
                setPath(file.webkitRelativePath.split('/')[0]); // Use folder name as title
            }

            const { data } = await axios.post(`${API_DEBUG_URL}-batch-upload`, {
                files: auditBatch
            });

            if (data.status === 'error') {
                setError(data.error);
            } else {
                setFiles(data.files || []);
                if (data.files?.length > 0) setSelectedFile(data.files[0]);
            }

        } catch (err) {
            setError('Neural Batch Upload Fault: ' + err.message);
        } finally {
            setScanning(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setScanning(true);
        setError(null);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target.result;
                const { data } = await axios.post(`${API_DEBUG_URL}-upload`, {
                    fileName: file.name,
                    content: content
                });
                if (data.status === 'error') {
                    setError(data.error);
                } else {
                    setFiles(data.files || []);
                    if (data.files?.length > 0) setSelectedFile(data.files[0]);
                }
            };
            reader.readAsText(file);
        } catch (err) {
            setError('Neural Upload Fault: ' + err.message);
        } finally {
            setScanning(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-[60px] flex flex-col font-outfit text-white overflow-hidden selection:bg-primary/20"
        >
            {/* --- IDE Tactical Header --- */}
            <div className="h-16 border-b border-[var(--eu-glass-border)] bg-[var(--eu-bg-void)] px-8 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/40 to-transparent opacity-30" />
                <div className="flex items-center gap-6">
                    <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20 shadow-neon">
                        <Cpu className="text-primary animate-pulse" size={18} />
                    </div>
                    <div>
                        <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Neural IDE</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Diagnostic Protocol: Active Substrate</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleRunDebug} className="flex-1 max-w-2xl px-12 relative group/search">
                    <div className="relative group overflow-hidden rounded-[20px] transition-all duration-700">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within/search:text-primary transition-colors flex items-center gap-2">
                            <Folder size={16} />
                        </div>
                        <input 
                            type="text"
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            placeholder="Enter Tactical Folder Path... (e.g., C:\Users\project)"
                            className="w-full h-12 bg-white/5 border border-white/5 pl-16 pr-52 rounded-[20px] text-[12px] font-bold text-white focus:outline-none focus:border-primary/40 focus:bg-white/10 focus:shadow-neon transition-all placeholder:text-muted/30"
                        />
                        
                        <div className="absolute right-36 top-1/2 -translate-y-1/2 flex items-center gap-1">
                             {/* Folder Picker (Visual Path Aid) */}
                             <input 
                                type="file" 
                                id="folder-picker" 
                                webkitdirectory="true" 
                                directory="true" 
                                className="hidden" 
                                onChange={handleFolderUpload}
                             />
                             <label 
                                htmlFor="folder-picker"
                                className="p-2 hover:bg-white/10 rounded-lg text-muted cursor-pointer transition-colors"
                                title="Pick Project Folder"
                             >
                                <Folder size={14} />
                             </label>

                             {/* Direct File Upload */}
                             <input 
                                type="file" 
                                id="file-picker" 
                                className="hidden" 
                                onChange={handleFileUpload}
                             />
                             <label 
                                htmlFor="file-picker"
                                className="p-2 hover:bg-white/10 rounded-lg text-muted cursor-pointer transition-colors"
                                title="Upload Source File"
                             >
                                <Search size={14} strokeWidth={3} />
                             </label>
                        </div>

                        <button 
                            type="submit"
                            disabled={scanning || !path}
                            className={`absolute right-2 top-2 h-8 px-6 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-neon hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30 disabled:pointer-events-none`}
                        >
                            {scanning ? <Zap className="animate-spin" size={12} /> : <Terminal size={12} />}
                            {scanning ? 'Auditing' : 'Initialize'}
                        </button>
                    </div>
                </form>

                <div className="flex items-center gap-6">
                    <div className="h-6 w-[1px] bg-white/5" />
                    <button 
                        onClick={onClose}
                        className="size-10 flex items-center justify-center bg-[var(--eu-bg-void)]/40 hover:bg-primary/20 border border-[var(--eu-glass-border)] rounded-xl transition-all hover:border-primary/40 group/close"
                    >
                        <X size={18} className="text-muted group-hover/close:text-primary transition-colors rotate-0 group-hover/close:rotate-90 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* --- Core Workspace Area --- */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Panel 1: Explorer */}
                <div className="w-full md:w-80 h-1/3 md:h-full flex-none overflow-hidden border-b md:border-b-0 md:border-r border-[var(--eu-glass-border)]">
                    <FileExplorer 
                        files={files} 
                        onFileSelect={setSelectedFile} 
                        selectedFile={selectedFile} 
                        isScanning={scanning} 
                    />
                </div>

                {/* Panel 2: Editor */}
                <div className="flex-1 h-full min-w-0 border-b md:border-b-0 md:border-r border-[var(--eu-glass-border)]">
                    <CodeEditor 
                        file={selectedFile} 
                        onAcceptPatch={(patch) => handleAcceptPatch(selectedFile, patch)} 
                        onRejectPatch={() => {}} 
                    />
                </div>

                {/* Panel 3: Patches - Hidden on mobile if needed, or sidebar-like */}
                <div className="w-full md:w-96 h-1/3 md:h-full flex-none overflow-y-auto bg-black/20">
                    <PatchPanel 
                        file={selectedFile} 
                        onAcceptPatch={(patch) => handleAcceptPatch(selectedFile, patch)} 
                        onRejectPatch={(patch) => handleRejectPatch(selectedFile, patch)}
                        onDeployAll={() => handleDeployAll(selectedFile)}
                        deploying={deploying}
                    />
                </div>
            </div>

            {/* --- IDE Ticker / Status Bar --- */}
            <div className="h-8 bg-[var(--eu-bg-void)]/60 border-t border-[var(--eu-glass-border)] px-8 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted select-none">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                        <span>Infrastructure Synchronized</span>
                    </div>
                    <div className="opacity-20">//</div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={12} className="text-primary" />
                        <span>Mimov2 Pro Active</span>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    {scanning && (
                        <div className="flex items-center gap-3 text-primary animate-pulse">
                            <Cpu size={12} className="animate-spin" />
                            <span>Processing Neural Patch Matrix...</span>
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <span>CPU_LOAD: 0.1%</span>
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="w-1/4 h-full bg-primary shadow-neon" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Notification Layer */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 p-6 glass-euphoria border border-primary/30 rounded-3xl shadow-2xl flex items-center gap-6"
                    >
                        <div className="size-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary">
                            <AlertTriangle size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Neural Breach Identified</p>
                            <p className="text-sm font-bold text-white italic">"{error}"</p>
                        </div>
                        <button onClick={() => setError(null)} className="ml-10 text-muted hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default IDEView;
