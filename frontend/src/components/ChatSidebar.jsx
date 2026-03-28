import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Plus, Clock, History, Calendar, 
  Search, MoreVertical, Trash2, Pin, PinOff, 
  ChevronRight, Activity, Globe, UserPlus, 
  Edit2, LogOut, Moon, FileText 
} from 'lucide-react';

const ChatSidebar = ({ 
  onSelectSession, 
  onViewReport,
  activeReportId, 
  onNewSession, 
  refreshKey, 
  onToggleTheme, 
  theme,
  onGroupChart,
  onDeleteReport,
  confirm,
  prompt,
  setAlert
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    const raw = localStorage.getItem('userData');
    const userId = localStorage.getItem('userId');

    if (raw) {
      try {
        setUserData(JSON.parse(raw));
      } catch (e) {
        console.error("Neural Identity Corruption:", e);
      }
    } else if (userId) {
      // Tactical Background Sync
      import('axios').then(async a => {
        try {
          const { data } = await a.default.get(`http://localhost:5000/api/auth/profile/${userId}`);
          const syncedData = { username: data.username, email: data.email };
          setUserData(syncedData);
          localStorage.setItem('userData', JSON.stringify(syncedData));
        } catch (err) {
          console.error("Profile Sync Failed:", err);
        }
      });
    }
  }, []);

  const loadReports = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
       setLoading(false);
       return;
    }
    setLoading(true);
    try {
      const { data } = await import('axios').then(a => a.default.get(`http://localhost:5000/api/reports?userId=${userId}`));
      // Sort: Pinned first, then by date
      const sorted = data.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setReports(sorted);
    } catch (err) {
      console.error("Sidebar Sync Failure", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [refreshKey]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Neural Deletion',
      message: 'This operation will permanently erase this session from the lattice. Proceed?',
      confirmText: 'Execute Deletion',
      type: 'danger'
    });
    if (!ok) return;

    try {
      await import('axios').then(a => a.default.delete(`http://localhost:5000/api/report/${id}`));
      setAlert({ type: 'success', message: 'Session Purged: Node removed from lattice.' });
      onDeleteReport(id);
      loadReports();
    } catch (err) {
      setAlert({ type: 'error', message: 'Purge Failed: Neural interference detected.' });
    }
  };

  const handlePin = async (id) => {
    try {
      await import('axios').then(a => a.default.patch(`http://localhost:5000/api/report/${id}/pin`));
      loadReports();
    } catch (err) {
      console.error("Pin Error:", err);
      setAlert({ type: 'error', message: 'Neural Pin Failed' });
    }
  };

  const handleRename = async (id, currentName) => {
    const newName = await prompt({
      title: 'Neural Relabeling',
      message: 'Define a new identifier for this tactical session:',
      confirmText: 'Sync Identifier'
    });
    if (!newName) return;

    try {
      await import('axios').then(a => a.default.patch(`http://localhost:5000/api/report/${id}/rename`, { 
        name: newName 
      }));
      loadReports();
    } catch (err) {
      setAlert({ type: 'error', message: 'Relabeling Failed' });
    }
  };

  const handleShare = (id) => {
    const url = `${window.location.origin}/report/${id}`;
    navigator.clipboard.writeText(url);
    setAlert({ type: 'success', message: 'Session Link Captured: Ready for distribution.' });
  };

  const handleReset = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    localStorage.removeItem('sentinel_pending_progress');
    localStorage.removeItem('sentinel_chat_messages');
    localStorage.removeItem('sentinel_scan_params');
    window.location.reload();
  };

  const menuRef = useRef(null);

  const filteredReports = reports.filter(r => 
    (r.customName || r.url).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupReports = () => {
    const pinned = [];
    const others = [];

    filteredReports.forEach(r => {
      if (r.isPinned) pinned.push(r);
      else others.push(r);
    });

    return { pinned, others };
  };

  const { pinned, others } = groupReports();

  const SidebarItem = ({ report }) => (
    <div className="relative group">
      <motion.button
        whileHover={{ scale: 1.01, x: 2 }}
        onClick={() => onSelectSession(report._id)}
        className={`w-full flex items-center gap-1 p-1 rounded-lg text-left transition-all ${activeReportId === report._id
            ? 'glass-euphoria border-eu-accent/30 shadow-neon'
            : 'hover:bg-[var(--eu-bg-void)]/10 border border-transparent'
          }`}
      >
        <div className={`p-1 rounded-lg transition-all ${activeReportId === report._id
            ? 'bg-eu-accent/20 text-eu-accent shadow-[0_0_15px_var(--eu-glow)]'
            : 'text-muted group-hover:text-eu-accent/50'
          }`}>
          {report.isPinned ? <Pin size={14} className="fill-current" /> : <Globe size={14} />}
        </div>
        <div className="flex-1 min-w-0 pr-24">
          <p className={`text-[9.5px] font-black truncate lowercase tracking-tight ${activeReportId === report._id ? 'text-[var(--eu-text-main)]' : 'text-[var(--eu-text-main)] opacity-40 group-hover:opacity-100'
            }`}>
            {report.customName || new URL(report.url).hostname}
          </p>
          <p className="text-[7.5px] font-mono text-muted truncate opacity-50 font-bold group-hover:opacity-80 transition-opacity">
            {report.status === 'completed' ? 'Analysis Completed' : report.status === 'in-progress' ? 'Analysis in Progress...' : report.status === 'failed' ? 'Analysis Failed' : 'Pending'}
          </p>
        </div>
      </motion.button>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onViewReport(report._id); }}
          className="p-1.5 rounded-lg transition-all hover:bg-white/10 opacity-0 group-hover:opacity-100 text-[var(--eu-text-main)] opacity-40 hover:text-eu-accent"
          title="View Full Technical Report"
        >
          <FileText size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handlePin(report._id); }}
          className={`p-1.5 rounded-lg transition-all hover:bg-[var(--eu-bg-void)]/10 ${report.isPinned ? 'opacity-100 text-eu-accent' : 'opacity-0 group-hover:opacity-100 text-[var(--eu-text-main)] opacity-40'}`}
          title={report.isPinned ? "Unpin Session" : "Pin Session"}
        >
          <Pin size={12} className={report.isPinned ? 'fill-current' : ''} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (activeMenuId === report._id) {
              setActiveMenuId(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPosition({
                top: rect.top,
                left: rect.right + 8
              });
              setActiveMenuId(report._id);
            }
          }}
          className={`p-1.5 rounded-lg transition-all hover:bg-white/10 ${activeMenuId === report._id || activeReportId === report._id ? 'opacity-100 bg-eu-accent/20 text-eu-accent' : 'opacity-0 group-hover:opacity-100 text-muted'}`}
        >
          <MoreVertical size={14} />
        </button>
      </div>

    </div>
  );

  const Section = ({ title, items, icon: Icon }) => items.length > 0 && (
    <div className="space-y-0.5 mb-1">
      <div className="flex items-center gap-2 px-3 mb-1 opacity-30">
        <Icon size={10} className="text-[var(--eu-text-main)] opacity-40" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--eu-text-main)] opacity-40">{title}</span>
      </div>
      <div className="space-y-1">
        {items.map(report => <SidebarItem key={report._id} report={report} />)}
      </div>
    </div>
  );

  const MenuButton = ({ icon, label, onClick, danger, isDark }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg mb-0.5
        ${danger
          ? 'text-primary hover:bg-primary/10'
          : isDark ? 'text-[var(--eu-text-main)]/80 hover:bg-[var(--eu-bg-void)]/10 hover:text-[var(--eu-text-main)]' : 'text-[var(--eu-text-main)]/60 hover:bg-[var(--eu-hover-bg)]'
        }`}
    >
      <span className={danger ? 'text-primary' : isDark ? 'text-eu-accent' : 'text-[var(--eu-text-main)] opacity-40'}>{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="w-full h-full glass-node flex flex-col relative group/sidebar z-20">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-7 bg-eu-accent/20 rounded-lg flex items-center justify-center border border-eu-accent/20 shadow-neon">
              <MessageSquare className="text-eu-accent size-3.5" />
            </div>
            <h2 className="text-[11px] font-black uppercase tracking-industrial text-[var(--eu-text-main)] opacity-70">Neural Hub</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onGroupChart}
              className="size-7 bg-[var(--eu-bg-void)]/10 hover:bg-[var(--eu-bg-void)]/20 border border-[var(--eu-glass-border)] rounded-xl flex items-center justify-center text-[var(--eu-text-main)] opacity-40 hover:text-eu-accent hover:scale-110 transition-all"
              title="Global Intelligence"
            >
              <Activity size={14} />
            </button>
            <button
              onClick={onNewSession}
              className="size-7 bg-[var(--eu-bg-void)]/10 hover:bg-[var(--eu-bg-void)]/20 border border-[var(--eu-glass-border)] rounded-xl flex items-center justify-center text-[var(--eu-text-main)] opacity-40 hover:scale-110 transition-all"
              title="New Neural Session"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="relative group/search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--eu-text-main)] opacity-40 size-3.5 group-focus-within/search:text-eu-accent transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Intelligence..."
            className="w-full bg-[var(--eu-bg-void)] border border-[var(--eu-glass-border)] rounded-xl py-1.5 pl-9 pr-3 text-[9px] uppercase font-black tracking-widest text-[var(--eu-text-main)] focus:outline-none focus:border-primary/30 focus:bg-[var(--eu-bg-card)] transition-all placeholder:text-[var(--eu-text-main)] placeholder:opacity-20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-visible px-2 custom-scrollbar pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <div className="size-10 border-2 border-eu-accent border-t-transparent animate-spin rounded-full mb-4" />
            <p className="text-[9px] font-black uppercase tracking-widest text-eu-accent">Loading Lattice...</p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <Section 
                title="Pinned Intelligence" 
                items={pinned} 
                icon={Pin} 
              />
            )}
            
            {others.length > 0 && (
              <Section 
                title="Recent Infrastructure" 
                items={others} 
                icon={Activity} 
              />
            )}
          </>
        )}
      </div>

      <div className="p-3 border-t border-[var(--eu-glass-border)] bg-[var(--eu-bg-void)]/20 backdrop-blur-md">
        <div className="flex items-center gap-3 p-1.5 bg-[var(--eu-bg-card)] rounded-xl border border-[var(--eu-glass-border)] group/profile relative hover:border-primary/20 transition-all">
          <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
            <span className="text-[11px] font-black text-[var(--eu-text-main)]">
              {userData?.username ? userData.username[0].toUpperCase() : (userData?.email ? userData.email[0].toUpperCase() : 'U')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-[var(--eu-text-main)] truncate uppercase tracking-tighter">
              {userData?.username || (userData?.email?.split('@')[0] || 'SYNC PENDING...')}
            </p>
            <span className="text-[8px] font-mono text-primary truncate block uppercase tracking-widest font-black opacity-60">
              {userData?.email || 'OFFLINE NODE'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Tactical Logout"
              className="size-8 bg-[var(--eu-bg-void)] border border-[var(--eu-glass-border)] rounded-xl flex items-center justify-center text-[var(--eu-text-main)] opacity-40 group-hover/profile:opacity-100 transition-all hover:bg-red-500/20 hover:text-red-500"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

      </div>
      {/* Euphoria Action Menu Portal */}
      {activeMenuId && createPortal(
        (() => {
          const isDark = theme === 'dark';
          const panelStyle = isDark ? {
            position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 999999,
            width: '14rem',
            background: 'var(--eu-bg-card-glass)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 0, 127, 0.2)',
            borderRadius: '16px', padding: '6px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255, 0, 127, 0.15), 0 24px 60px rgba(255, 0, 127, 0.15)',
            overflow: 'hidden',
          } : {
            position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 999999,
            width: '14rem',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '16px', padding: '6px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          };
          const headerStyle = {
            padding: '6px 12px 8px',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(226,232,240,0.8)',
            marginBottom: '4px',
          };
          const headerTextStyle = {
            fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: isDark ? 'rgba(148,163,184,0.45)' : 'rgba(148,163,184,1)',
          };
          const dividerStyle = {
            height: '1px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(226,232,240,0.8)',
            margin: '4px 8px',
          };
          return (
            <>
              <div className="fixed inset-0" style={{ zIndex: 999998 }} onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={panelStyle}
              >
                <div style={headerStyle}><span style={headerTextStyle}>Options</span></div>
                <MenuButton isDark={isDark} icon={<UserPlus size={14} />} label="Start a group chat" onClick={() => { handleShare(activeMenuId); setActiveMenuId(null); }} />
                <MenuButton isDark={isDark} icon={<Edit2 size={14} />} label="Rename" onClick={() => { const report = reports.find(r => r._id === activeMenuId); handleRename(activeMenuId, report?.customName || (report ? new URL(report.url).hostname : '')); setActiveMenuId(null); }} />
                <div style={dividerStyle} />
                <MenuButton isDark={isDark} icon={<Pin size={14} />} label="Pin chat" onClick={() => { handlePin(activeMenuId); setActiveMenuId(null); }} />
                <div style={dividerStyle} />
                <MenuButton isDark={isDark} icon={<Trash2 size={14} />} label="Delete" onClick={() => { handleDelete(activeMenuId); setActiveMenuId(null); }} danger />
              </motion.div>
            </>
          );
        })()
        , document.body)}

    </div>
  );
};

export default ChatSidebar;
