import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="loading-screen-container"
    >
      <div className="loading-content">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360],
            filter: [
              'drop-shadow(0 0 10px var(--eu-glow))',
              'drop-shadow(0 0 30px var(--eu-glow))',
              'drop-shadow(0 0 10px var(--eu-glow))'
            ]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="loading-logo"
        >
          <Shield size={64} className="text-primary" />
        </motion.div>
        
        <div className="loading-text-wrapper">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="loading-title"
          >
            SENTINEL
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="loading-status"
          >
            Initializing Neural Protocols...
          </motion.p>
        </div>

        <div className="loading-bar-container">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="loading-bar"
          />
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="loading-bg-grid" />
      <div className="loading-glow-spot" />
    </motion.div>
  );
};

export default LoadingScreen;
