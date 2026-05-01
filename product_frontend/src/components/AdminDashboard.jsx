import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, Activity, Package, Loader2, LogOut, Terminal, Server } from 'lucide-react';
import axios from 'axios';

const API_URL = "https://itspriceradar.netlify.app/api/admin";

function AdminDashboard({ onLogout }) {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('pr_admin_token');
      const res = await axios.get(`${API_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.stats);
      setRecentUsers(res.data.recentUsers);
    } catch (err) {
      setError("FAILED_TO_SYNC_TACTICAL_DATA");
      if (err.response?.status === 401 || err.response?.status === 403) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="text-[#00ff9d]"
      >
        <Activity size={48} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-6 sm:p-12 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b border-neutral-900 pb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter flex items-center gap-3">
              <ShieldAlert className="text-[#00ff9d]" /> 
              COMMAND_CENTER <span className="text-xs bg-[#00ff9d] text-black px-2 py-1 ml-2">ADMIN_LEVEL</span>
            </h1>
            <p className="text-neutral-500 text-xs mt-2 tracking-widest uppercase">// SYSTEM_UPTIME: {stats?.nodeVersion} | STATUS: {stats?.systemStatus}</p>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-6 py-3 border border-red-900/30 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs tracking-widest"
          >
            <LogOut size={16} /> TERMINATE_ADMIN_SESSION
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<Users />} label="TOTAL_OPERATORS" value={stats?.totalUsers} color="#00ff9d" />
          <StatCard icon={<Activity />} label="VERIFIED_IDENTITIES" value={stats?.verifiedUsers} color="#00d2ff" />
          <StatCard icon={<Package />} label="ACTIVE_ALERTS" value={stats?.activeAlerts} color="#ff0055" />
          <StatCard icon={<Server />} label="SERVER_LATENCY" value="12ms" color="#ffd700" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Operators Table */}
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-neutral-900 p-8 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Terminal size={64} /></div>
            <h3 className="text-[#00ff9d] text-sm mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#00ff9d] animate-pulse"></div>
              RECENT_OPERATOR_LOGS
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-neutral-600 text-[10px] uppercase border-b border-neutral-900">
                    <th className="pb-4 px-2">ID</th>
                    <th className="pb-4 px-2">NAME</th>
                    <th className="pb-4 px-2">STATUS</th>
                    <th className="pb-4 px-2">JOINED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {recentUsers.map((user, i) => (
                    <tr key={i} className="text-xs hover:bg-neutral-900/50 transition-colors">
                      <td className="py-4 px-2 text-neutral-400">{user.email}</td>
                      <td className="py-4 px-2 text-white font-bold">{user.name || "UNNAMED"}</td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-0.5 rounded-none border ${user.isVerified ? 'border-[#00ff9d]/30 text-[#00ff9d]' : 'border-red-900/30 text-red-500'}`}>
                          {user.isVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-neutral-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-[#0a0a0a] border border-neutral-900 p-8">
            <h3 className="text-[#00ff9d] text-sm mb-6 flex items-center gap-2">
               <Activity size={16} /> SYSTEM_TRAFFIC_LOGS
            </h3>
            <div className="space-y-4">
               {[
                 { time: "14:22:01", event: "NEW_USER_JOINED", color: "#00ff9d" },
                 { time: "14:20:55", event: "OTP_SENT_TO_PROCODER", color: "#ffd700" },
                 { time: "14:19:30", event: "SCRAPE_REQUEST_AMAZON", color: "#00d2ff" },
                 { time: "14:15:12", event: "DATABASE_BACKUP_COMPLETE", color: "#888" },
                 { time: "14:10:05", event: "SECURITY_SCAN_COMPLETED", color: "#00ff9d" },
               ].map((log, i) => (
                 <div key={i} className="flex gap-4 border-l-2 border-neutral-800 pl-4 py-1">
                   <span className="text-neutral-600 text-[9px] shrink-0">{log.time}</span>
                   <span className="text-[10px] tracking-tight" style={{ color: log.color }}>{log.event}</span>
                 </div>
               ))}
            </div>
            <button className="w-full mt-8 py-3 bg-neutral-900 text-neutral-400 hover:text-white transition-all text-[10px] tracking-widest border border-neutral-800">
              VIEW_FULL_DIAGNOSTICS
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-[#0a0a0a] border border-neutral-900 p-6 relative group overflow-hidden">
      <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 transition-transform group-hover:scale-[1.7] duration-500" style={{ color }}>{icon}</div>
      <div className="flex items-center gap-3 mb-4 text-neutral-500">
        <div style={{ color }}>{React.cloneElement(icon, { size: 18 })}</div>
        <span className="text-[10px] tracking-widest uppercase">{label}</span>
      </div>
      <div className="text-3xl font-bold tracking-tighter" style={{ color }}>{value}</div>
      <div className="mt-4 h-1 w-full bg-neutral-900">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "70%" }}
          className="h-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
