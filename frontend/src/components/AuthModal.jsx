import { API_URL, SOCKET_URL } from '../config/api';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid protocol format: Email invalid');
      setLoading(false);
      return;
    }

    if (!isLogin && !username) {
      setError('Alias required for initialization');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Access Key requires 6+ characters');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        email,
        password,
        username: isLogin ? undefined : username
      });

      const { token, userId, username: resUsername, email: resEmail } = response.data;
      
      console.log("Authentication Successful. Initializing Identity...");
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('userData', JSON.stringify({ username: resUsername, email: resEmail }));
      
      // Force a clean state refresh
      onLogin();
      onClose();
    } catch (err) {
      console.error("Auth System Error:", err);
      const message = err.response?.data?.message || err.message || 'Protocol Initialization Failed: Check Credentials';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 glass-overlay"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md glass-modal glow-shadow overflow-hidden p-8 rounded-[32px]"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all active:scale-95"
        >
          <X size={20} />
        </button>

        <div>
          <div className="flex justify-center mb-10">
            <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 float-animation">
              <ShieldCheck className="text-primary" size={32} />
            </div>
          </div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-[var(--eu-text-main)] mb-3 tracking-tight">
              {isLogin ? 'Proprietary Access' : 'Create Intelligence'}
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              {isLogin ? 'Enter your credentials to access the Sentinel console.' : 'Initialize your email for autonomous diagnostic audits.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3 text-primary text-xs font-bold uppercase tracking-widest">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="relative group overflow-hidden"
              >
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full input-glass py-4 pl-12 pr-4 text-sm focus:outline-none"
                />
              </motion.div>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Secure Email"
                required
                className="w-full input-glass py-4 pl-12 pr-4 text-sm focus:outline-none"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Access Key"
                required
                className="w-full input-glass py-4 pl-12 pr-4 text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-premium text-white font-black min-h-[56px] py-4 rounded-2xl flex items-center justify-center gap-3 group mt-8 select-none disabled:opacity-50"
            >
              <span className="tracking-widest uppercase text-xs">
                {loading ? 'Processing...' : (isLogin ? 'Authenticate' : 'Initialize')}
              </span>
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-text-muted">
              {isLogin ? "Unauthorized?" : "Already verified?"}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-primary hover:text-[var(--eu-text-main)] transition-colors underline underline-offset-8 font-bold ml-1 uppercase text-xs tracking-widest"
              >
                {isLogin ? 'Join Sentinel' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;
