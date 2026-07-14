import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Mail, AlertCircle, MapPin } from 'lucide-react';

import bcrypt from 'bcryptjs';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic login against the custom 'users' table
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select(`
          id, email, password_hash, full_name, role, franchise_id,
          franchises (name)
        `)
        .eq('email', email)
        .limit(1);

      if (fetchError) throw fetchError;

      if (!users || users.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = users[0];
      
      // Verify bcrypt hash
      const isValid = bcrypt.compareSync(password, user.password_hash);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }

      // Format user session data
      const userData = {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        franchise_id: user.franchise_id,
        franchise_name: user.franchises?.name || 'All Franchises (Admin)'
      };

      // Store in localStorage
      localStorage.setItem('kiosk_user', JSON.stringify(userData));
      
      // Update app state
      if (onLogin) onLogin(userData);
      
      navigate('/map');
      
    } catch (err) {
      console.error('Login error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-indigo-500/20"></div>
            <MapPin className="text-emerald-400 relative z-10 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" size={40} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-white">
          Kiosk Operations
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 font-medium tracking-wide uppercase">
          Franchise Command Center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:rounded-3xl sm:px-10 border border-slate-700/50">
          
          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/50 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-rose-400 mt-0.5" size={18} />
              <p className="text-sm font-medium text-rose-300">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="admin@kioskmap.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] text-sm font-black tracking-widest uppercase text-slate-900 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
