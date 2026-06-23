import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Key, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import constructionBg from '../assets/images/construction_background_1782186855507.jpg';

export function Login() {
  const { signIn, signInWithEmail, error: contextError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const error = localError || contextError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    try {
      setLocalError('');
      setLoading(true);
      await signInWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError('');
      setLoading(true);
      await signIn();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 overflow-hidden"
    >
      {/* Background with Construction Image and Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[40000ms] ease-linear scale-110"
        style={{ 
          backgroundImage: `url(${constructionBg})`,
          animation: 'slow-pan 80s infinite alternate'
        }}
      />
      <div className="absolute inset-0 z-1 bg-gradient-to-br from-slate-950/70 via-slate-900/40 to-red-950/20" />
      
      {/* Dynamic Overlay Grain/Noise Effect for Coordination */}
      <div className="absolute inset-0 z-2 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Modern Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20">
          <div className="bg-red-600 px-8 py-12 text-center relative overflow-hidden">
            {/* Geometric accents for Enterprise feel */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -ml-20 -mb-20 blur-2xl" />
            
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative z-10 flex justify-center mb-6"
            >
              <div className="bg-white p-5 rounded-2xl shadow-xl border border-white/20 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-8 bg-red-600 rounded-full" />
                  <div className="w-2 h-6 bg-blue-600 rounded-full" />
                  <div className="w-2 h-4 bg-red-600 rounded-full" />
                </div>
              </div>
            </motion.div>
            
            <h2 className="relative z-10 text-4xl font-black text-white font-display tracking-tighter leading-none mb-2">
              RED SEA
            </h2>
            <div className="relative z-10 flex items-center justify-center gap-3">
              <div className="h-[1px] w-8 bg-white/30" />
              <p className="text-red-100 text-[10px] font-bold uppercase tracking-[0.4em] opacity-80">
                HOLDING COMPANY
              </p>
              <div className="h-[1px] w-8 bg-white/30" />
            </div>
          </div>

          <div className="p-8 sm:p-12">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded"
              >
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </motion.div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Employee Identity
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-red-500 text-slate-400">
                    <Mail className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    required
                    disabled={loading}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-900 text-sm"
                    placeholder="email@redseaholding.net"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Secure Access Key
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-red-500 text-slate-400">
                    <Key className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    required
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-900 text-sm"
                    placeholder="Enter password"
                  />
                </div>
              </motion.div>

              <div className="flex items-center justify-between text-xs px-1">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 transition-all"
                  />
                  <span className="ml-2 text-slate-500 group-hover:text-slate-700 transition-colors">Remember device</span>
                </label>
                <button type="button" className="font-semibold text-red-600 hover:text-red-700 transition-colors">
                  Reset Password
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In Now
                        <LogIn className="w-4 h-4" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
              </motion.div>
            </form>

            <div className="mt-8 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-white text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Enterprise Access</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm font-semibold text-slate-700">Google Service Login</span>
              </motion.button>

              <div className="mt-8 flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  System Online & Secure
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center text-[10px] text-white/50 font-medium uppercase tracking-[0.3em]"
        >
          &copy; 2026 Red Sea Holding Company | Technical Services Unit
        </motion.p>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slow-pan {
          from { transform: scale(1.1) translateX(0%); }
          to { transform: scale(1.1) translateX(-5%); }
        }
      `}} />
    </div>
  );
}
