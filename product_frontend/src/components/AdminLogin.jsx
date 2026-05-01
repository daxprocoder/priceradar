import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API_URL = "https://itspriceradar.netlify.app/api/admin";

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem('pr_admin_token', res.data.token);
      onLogin();
    } catch (err) {
      setError("AUTHENTICATION_FAILURE: INVALID_CREDENTIALS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00ff9d] opacity-50 animate-pulse"></div>
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#00ff9d]/10 border border-[#00ff9d]/30 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="text-[#00ff9d]" size={32} />
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tighter">TACTICAL_LOGIN</h2>
          <p className="text-neutral-600 text-[10px] tracking-widest mt-2 uppercase">// RESTRICTED_ADMIN_ACCESS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-600">
              <User size={18} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-neutral-800 text-white pl-8 py-3 outline-none focus:border-[#00ff9d] transition-colors"
              placeholder="ADMIN_IDENTIFIER"
            />
          </div>

          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-600">
              <Lock size={18} />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-neutral-800 text-white pl-8 py-3 outline-none focus:border-[#00ff9d] transition-colors"
              placeholder="ACCESS_CODE"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 text-red-500 text-[10px] flex items-center gap-2">
              <ShieldAlert size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full bg-[#00ff9d] text-black py-4 font-bold tracking-[0.2em] flex items-center justify-center overflow-hidden transition-all hover:bg-white"
          >
            <span className="relative z-10 flex items-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : "INITIATE_SESSION"}
              {!loading && <ArrowRight size={18} />}
            </span>
          </button>
        </form>

        <div className="mt-12 text-center text-[9px] text-neutral-700 tracking-widest">
           &copy; 2024 PRICERADAR SECURE_PROTOCOL_V4
        </div>
      </motion.div>
    </div>
  );
}

export default AdminLogin;
