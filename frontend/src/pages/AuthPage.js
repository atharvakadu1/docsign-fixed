// src/pages/AuthPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Btn, Input } from '../components/ui';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode]         = useState('login');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [warning, setWarning]   = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'signer' });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setWarning(null);
    try {
      let result;
      if (mode === 'login') {
        result = await login(form.email, form.password);
        if (result.warning) setWarning(result.warning);
      } else {
        result = await register(form);
      }
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">DocSign</h1>
          <p className="text-slate-400 text-sm">Biometric · Blockchain · SHA-256</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {/* Mode tabs */}
          <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setWarning(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize
                  ${mode === m ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Fraud warning */}
          {warning && (
            <div className="mb-4 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg flex gap-2">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400 mb-1">Security Notice</p>
                <ul className="text-xs text-amber-300/80 space-y-0.5">
                  {warning.flags?.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Input label="Full name" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Alice Johnson" required minLength={2} />
            )}

            <Input label="Email address" type="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="you@company.com" required />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={(e) => set('password', e.target.value)} placeholder="••••••••" required minLength={6}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Role</label>
                <select value={form.role} onChange={(e) => set('role', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="signer">Signer</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            )}

            <Btn type="submit" variant="primary" loading={loading} className="w-full mt-2">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Btn>
          </form>

          {/* Security badges */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-center text-xs text-slate-600 mb-3">Protected by</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {['bcrypt + salt', 'JWT auth', 'Rate limiting', 'Fraud detection'].map((t) => (
                <span key={t} className="text-xs bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full border border-slate-700">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
