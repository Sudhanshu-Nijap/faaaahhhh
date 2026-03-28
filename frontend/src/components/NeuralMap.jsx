import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Link as LinkIcon, Zap, AlertTriangle, Cpu } from 'lucide-react';

const NeuralMap = ({ structure, activeUrl, onNodeClick }) => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  // Simple Force-Directed Simulation Layer
  useEffect(() => {
    if (!structure || !structure.nodes || structure.nodes.length === 0) return;

    // Initialize positions in a circle
    const initialNodes = structure.nodes.map((n, i) => ({
      ...n,
      x: 300 + Math.cos((i / structure.nodes.length) * 2 * Math.PI) * 150,
      y: 250 + Math.sin((i / structure.nodes.length) * 2 * Math.PI) * 150,
      vx: 0,
      vy: 0,
    }));

    let currentNodes = [...initialNodes];
    const initialLinks = structure.links.map(l => ({ ...l }));

    // Run a few iterations of a simple force simulation
    for (let i = 0; i < 50; i++) {
      // 1. Repulsion between all nodes
      for (let j = 0; j < currentNodes.length; j++) {
        for (let k = j + 1; k < currentNodes.length; k++) {
          const n1 = currentNodes[j];
          const n2 = currentNodes[k];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy || 1;
          const force = 1000 / distSq;
          const fx = (dx / Math.sqrt(distSq)) * force;
          const fy = (dy / Math.sqrt(distSq)) * force;
          n1.vx += fx; n1.vy += fy;
          n2.vx -= fx; n2.vy -= fy;
        }
      }

      // 2. Attraction for links
      initialLinks.forEach(link => {
        const source = currentNodes.find(n => n.id === link.source);
        const target = currentNodes.find(n => n.id === link.target);
        if (source && target) {
          const dx = source.x - target.x;
          const dy = source.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 80) * 0.05;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.vx -= fx; source.vy -= fy;
          target.vx += fx; target.vy += fy;
        }
      });

      // 3. Center gravity
      currentNodes.forEach(n => {
        const dx = 300 - n.x;
        const dy = 250 - n.y;
        n.vx += dx * 0.01;
        n.vy += dy * 0.01;
        
        // Apply velocity & friction
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.5;
        n.vy *= 0.5;
      });
    }

    setNodes(currentNodes);
    setLinks(initialLinks);
  }, [structure]);

  if (!structure || nodes.length === 0) return (
    <div className="h-[500px] flex items-center justify-center glass-euphoria rounded-[32px] border-white/5 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest">Neural Map Initialization Pending...</p>
    </div>
  );

  return (
    <div className="relative w-full h-[500px] glass-euphoria rounded-[32px] border border-white/5 overflow-hidden group shadow-2xl">
      <div className="absolute top-6 left-8 z-10">
         <div className="flex items-center gap-3">
            <div className="size-8 bg-eu-accent/20 rounded-lg flex items-center justify-center border border-eu-accent/30 shadow-neon">
                <Globe size={14} className="text-eu-accent" />
            </div>
            <div>
                <h3 className="text-[12px] font-black uppercase tracking-industrial text-white">Neural Web Mapping</h3>
                <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">{nodes.length} Nodes Discovered</p>
            </div>
         </div>
      </div>

      <svg width="100%" height="100%" viewBox="0 0 600 500" className="cursor-move">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.2)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.05)" />
          </linearGradient>
        </defs>

        {/* Links */}
        {links.map((link, i) => {
          const source = nodes.find(n => n.id === link.source);
          const target = nodes.find(n => n.id === link.target);
          if (!source || !target) return null;
          return (
            <motion.line
              key={`link-${i}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: i * 0.02 }}
              x1={source.x} y1={source.y}
              x2={target.x} y2={target.y}
              stroke="url(#linkGradient)"
              strokeWidth="1"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const isActive = activeUrl === node.url;
          return (
            <motion.g
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, delay: i * 0.05 }}
              onClick={() => onNodeClick && onNodeClick(node.url)}
              className="cursor-pointer"
            >
              {/* Node Aura */}
              <circle
                cx={node.x} cy={node.y} r={isActive ? 12 : 8}
                fill={isActive ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.1)'}
                className={isActive ? 'animate-pulse' : ''}
              />
              {/* Main Node */}
              <circle
                cx={node.x} cy={node.y} r={isActive ? 6 : 4}
                fill={isActive ? '#8b5cf6' : '#475569'}
                filter={isActive ? 'url(#glow)' : ''}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              {/* Label */}
              <text
                x={node.x} y={node.y + 18}
                textAnchor="middle"
                className={`text-[7px] font-black uppercase tracking-widest font-outfit pointer-events-none ${isActive ? 'fill-white' : 'fill-slate-600 opacity-60'}`}
              >
                {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <div className="absolute bottom-6 right-8 flex items-center gap-4">
         <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-eu-accent shadow-neon" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Active Node</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-slate-600" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Internal Page</span>
         </div>
      </div>
    </div>
  );
};

export default NeuralMap;
