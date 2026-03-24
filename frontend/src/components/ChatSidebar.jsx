import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Trash2, 
  Plus, 
  MessageSquare, 
  Globe,
  Layout,
  Clock,
  Terminal,
  History, 
  ChevronRight, 
  Calendar,
  LogOut,
  RefreshCw,
  MoreVertical,
  BarChart3,
  Share2,
  Pin,
  UserPlus,
  Edit2,
  Archive,
  Share
} from 'lucide-react';
import axios from 'axios';

const MenuButton = ({ icon, label, onClick, danger, isDark }) => {
  const [hovered, setHovered] = React.useState(false);
  const baseStyle = {
    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: 500, textAlign: 'left', transition: 'all 0.18s ease',
    background: hovered
      ? danger
        ? isDark ? 'rgba(239,68,68,0.15)' : 'rgba(254,242,242,1)'
        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(241,245,249,1)'
      : 'transparent',
    color: danger
      ? hovered ? (isDark ? '#fca5a5' : '#dc2626') : (isDark ? '#f87171' : '#ef4444')
      : isDark ? '#e2e8f0' : '#1e293b',
  };
  const iconStyle = {
    color: danger
      ? hovered ? (isDark ? '#fca5a5' : '#dc2626') : '#f87171'
      : hovered ? (isDark ? '#a78bfa' : '#6366f1') : (isDark ? '#64748b' : '#94a3b8'),
    filter: hovered && isDark && !danger ? 'drop-shadow(0 0 5px rgba(167,139,250,0.8))' : 'none',
    transition: 'all 0.18s ease',
    flexShrink: 0,
  };
  return (
    <button
      style={baseStyle}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={iconStyle}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
};

const ChatSidebar = ({ onSelectSession, activeReportId, onNewSession, refreshKey, onToggleTheme, theme, onGroupChart }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userData, setUserData] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const fetchProfile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId || userId === 'null' || userId === 'undefined') {
        setUserData(null);
        return;
      }
      
      const { data } = await axios.get(`http://localhost:5000/api/auth/profile/${userId}`);
      setUserData(data);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn("Identity Sync Failure: User ID not found in current database shard.");
      }
      setUserData(null);
    }
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Purge this diagnostic record?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/report/${id}`);
      setReports(reports.filter(r => r._id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handlePin = async (id) => {
    try {
      const { data } = await axios.patch(`http://localhost:5000/api/report/${id}/pin`);
      setReports(reports.map(r => r._id === id ? data : r));
    } catch (err) {
      console.error("Pin failed", err);
    }
  };

  const handleShare = async (id) => {
    try {
      const { data } = await axios.patch(`http://localhost:5000/api/report/${id}/share`);
      if (data.url) {
        navigator.clipboard.writeText(data.url);
        alert(`Classroom Uplink Established! Invite codes copied to tactical clipboard.\n\nURL: ${data.url}`);
      }
    } catch (err) {
      console.error("Share failed", err);
      alert('Classroom Uplink Initialization Failed.');
    }
  };

  const handleRename = async (id, currentName) => {
    const newName = window.prompt("Enter new name for this session:", currentName);
    if (!newName || newName === currentName) return;
    try {
      const { data } = await axios.patch(`http://localhost:5000/api/report/${id}/rename`, { name: newName });
      setReports(reports.map(r => r._id === id ? data : r));
    } catch (err) {
      console.error("Rename failed", err);
    }
  };

  const handleArchive = async (id) => {
    try {
      const { data } = await axios.patch(`http://localhost:5000/api/report/${id}/archive`);
      setReports(reports.map(r => r._id === id ? data : r));
    } catch (err) {
      console.error("Archive failed", err);
    }
  };

  const fetchReports = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const { data } = await axios.get(`http://localhost:5000/api/reports?userId=${userId}`);
      setReports(data);
    } catch (err) {
      console.error("Sidebar fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchReports();
  }, [refreshKey]);

  const filteredReports = reports.filter(r => 
    !r.isArchived && r.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.scanDate || b.createdAt) - new Date(a.scanDate || a.createdAt);
  });

  const groupReports = () => {
    const now = new Date();
    const today = [];
    const yesterday = [];
    const older = [];

    sortedReports.forEach(r => {
      const date = new Date(r.createdAt);
      const diff = (now - date) / (1000 * 60 * 60 * 24);
      if (diff < 1) today.push(r);
      else if (diff < 2) yesterday.push(r);
      else older.push(r);
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupReports();

  const SidebarItem = ({ report }) => (
    <div className="relative group">
      <motion.button
        whileHover={{ scale: 1.01, x: 2 }}
        onClick={() => onSelectSession(report._id)}
        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all ${
          activeReportId === report._id 
          ? 'glass-euphoria border-eu-accent/30 shadow-neon' 
          : 'hover:bg-white/5 border border-transparent'
        }`}
      >
        <div className={`p-2 rounded-lg transition-all ${
          activeReportId === report._id 
          ? 'bg-eu-accent/20 text-eu-accent shadow-[0_0_15px_var(--eu-glow)]' 
          : 'text-slate-500 group-hover:text-eu-accent/50'
        }`}>
          {report.isPinned ? <Pin size={14} className="fill-current" /> : <Globe size={14} />}
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <p className={`text-[12px] font-black truncate uppercase tracking-tight ${
            activeReportId === report._id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
          }`}>
            {report.customName || new URL(report.url).hostname}
          </p>
          <p className="text-[10px] font-mono text-slate-500 truncate opacity-60 font-bold group-hover:opacity-100 transition-opacity">
            {report.aiInsights?.classification || 'SYNK_PENDING'}
          </p>
        </div>
      </motion.button>
      
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePin(report._id); }}
          className={`p-1.5 rounded-lg transition-all hover:bg-white/10 ${report.isPinned ? 'opacity-100 text-eu-accent' : 'opacity-0 group-hover:opacity-100 text-slate-500'}`}
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
          className={`p-1.5 rounded-lg transition-all hover:bg-white/10 ${activeMenuId === report._id || activeReportId === report._id ? 'opacity-100 bg-eu-accent/20 text-eu-accent' : 'opacity-0 group-hover:opacity-100 text-slate-500'}`}
        >
          <MoreVertical size={14} />
        </button>
      </div>

    </div>
  );

  const Section = ({ title, items, icon: Icon }) => items.length > 0 && (
    <div className="space-y-0.5 mb-2">
      <div className="flex items-center gap-2 px-3 mb-1 opacity-30">
        <Icon size={10} className="text-slate-400" />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{title}</span>
      </div>
      <div className="space-y-1">
        {items.map(report => <SidebarItem key={report._id} report={report} />)}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full glass-euphoria border-r-0 flex flex-col overflow-hidden relative group/sidebar rounded-[32px] shadow-xl z-20 bg-background-void transition-colors duration-700">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="size-8 bg-eu-accent/20 rounded-xl flex items-center justify-center border border-eu-accent/20 shadow-neon">
                <MessageSquare className="text-eu-accent size-4" />
              </div>
              <h2 className="text-[12px] font-black uppercase tracking-industrial text-white">Neural Hub</h2>
           </div>
           <button 
             onClick={onNewSession}
             className="size-8 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:scale-110 transition-all"
           >
             <Plus size={16} />
           </button>
        </div>

        <div className="relative group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4 group-focus-within/search:text-eu-accent transition-colors" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Intelligence..."
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-[10px] uppercase font-black tracking-widest text-slate-300 focus:outline-none focus:border-eu-accent/30 focus:bg-white/10 transition-all placeholder:text-slate-700"
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
            <Section title="Today" items={today} icon={Clock} />
            <Section title="Yesterday" items={yesterday} icon={History} />
            <Section title="Older" items={older} icon={Calendar} />
          </>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-white/2 bg-opacity-10 backdrop-blur-md">
         <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group/profile relative hover:border-eu-accent/20 transition-all">
            <div className="size-9 rounded-xl bg-eu-accent/20 border border-eu-accent/20 flex items-center justify-center shadow-neon">
                <span className="text-[12px] font-black text-white">
                    {userData?.username ? userData.username[0].toUpperCase() : (userData?.email ? userData.email[0].toUpperCase() : 'U')}
                </span>
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-[12px] font-black text-white truncate uppercase tracking-tighter">
                    {userData?.username || (userData?.email?.split('@')[0] || 'SYNC PENDING...')}
               </p>
               <span className="text-[8px] font-mono text-eu-accent truncate block uppercase tracking-widest font-black opacity-80">
                    {userData?.email || 'OFFLINE NODE'}
               </span>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleReset}
                    title="Tactical Logout"
                    className="size-9 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center text-slate-500 opacity-40 group-hover/profile:opacity-100 transition-all hover:bg-red-500/20 hover:text-red-500"
                >
                    <LogOut size={16} />
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
            background: 'rgba(14, 14, 18, 0.97)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '16px', padding: '6px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15), 0 24px 60px rgba(139,92,246,0.15)',
            overflow: 'hidden',
          } : {
            position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 999999,
            width: '14rem',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(226,232,240,1)',
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
                <MenuButton isDark={isDark} icon={<Edit2 size={14} />} label="Rename" onClick={() => { const report = reports.find(r => r._id === activeMenuId); handleRename(activeMenuId, report?.customName || new URL(report?.url).hostname); setActiveMenuId(null); }} />
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
