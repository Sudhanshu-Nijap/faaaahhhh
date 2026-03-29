import React from 'react';
import { File, Folder, ChevronRight, ChevronDown, Cpu, Zap, Bug } from 'lucide-react';

const FileExplorer = ({ files, onFileSelect, selectedFile, isScanning }) => {
  // Simple tree view logic
  const renderFiles = () => {
    if (isScanning) {
        return (
            <div className="flex flex-col items-center justify-center h-40 space-y-4 opacity-50">
                <Cpu className="animate-spin text-primary" size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest">Scanning Substrate...</span>
            </div>
        );
    }

    if (!files || files.length === 0) {
        return (
            <div className="p-8 text-center opacity-30">
                <Folder size={32} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-tighter">No Source Detected</p>
            </div>
        );
    }

    return (
      <div className="space-y-1">
        {files.map((file, idx) => (
          <button
            key={idx}
            onClick={() => onFileSelect(file)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
              selectedFile?.path === file.path 
                ? 'bg-primary/10 border border-primary/20 text-primary shadow-neon-small scale-105 z-10' 
                : 'hover:bg-white/5 text-muted border border-transparent'
            }`}
          >
            <div className={`shrink-0 ${selectedFile?.path === file.path ? 'text-primary' : 'text-slate-600'}`}>
                {file.fixed ? <Zap size={14} className="animate-pulse" /> : <File size={14} />}
            </div>
            <div className="flex-1 text-left">
                <p className="text-[11px] font-bold truncate">{file.name}</p>
                <p className="text-[8px] opacity-40 uppercase tracking-tighter">{file.source || 'Pending'}</p>
            </div>
            {file.fixed && (
                <div className="size-1.5 rounded-full bg-primary shadow-neon animate-pulse" />
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--eu-bg-void)]/40 border-r border-[var(--eu-glass-border)]">
      <div className="p-6 border-b border-[var(--eu-glass-border)]">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">File Explorer</h3>
        <p className="text-[8px] text-muted uppercase mt-1">Source Artifacts</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {renderFiles()}
      </div>
      <div className="p-4 bg-primary/5 border-t border-[var(--eu-glass-border)]">
         <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-black uppercase text-primary">Uplink Active</span>
         </div>
      </div>
    </div>
  );
};

export default FileExplorer;
