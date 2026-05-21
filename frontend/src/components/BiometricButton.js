// src/components/BiometricButton.js
import React, { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Fingerprint, CheckCircle, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import { Btn } from './ui';

// ── Register biometric credential ─────────────────────────
export function BiometricRegister({ onSuccess }) {
  const [state, setState] = useState('idle'); // idle | loading | success | error
  const [msg, setMsg]     = useState('');

  const register = async () => {
    setState('loading');
    setMsg('Requesting options from server...');
    try {
      // Step 1: Get challenge from server
      const optRes = await authAPI.webauthnRegOptions();
      const options = optRes.data;

      setMsg('Waiting for biometric (fingerprint/face)...');

      // Step 2: Trigger browser biometric prompt
      const attResp = await startRegistration(options);

      setMsg('Verifying with server...');

      // Step 3: Send assertion to server
      const verifyRes = await authAPI.webauthnRegVerify(attResp);

      setState('success');
      setMsg(`✓ Registered: ${verifyRes.data.deviceName}`);
      toast.success('Biometric registered successfully!');
      onSuccess?.();
    } catch (err) {
      setState('error');
      const msg = err.response?.data?.error || err.message || 'Biometric registration failed';
      setMsg(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
        ${state === 'idle'    ? 'bg-slate-700 border-2 border-slate-600' : ''}
        ${state === 'loading' ? 'bg-blue-900/40 border-2 border-blue-500 animate-pulse' : ''}
        ${state === 'success' ? 'bg-emerald-900/40 border-2 border-emerald-500' : ''}
        ${state === 'error'   ? 'bg-red-900/40 border-2 border-red-500' : ''}
      `}>
        {state === 'idle'    && <Fingerprint size={36} className="text-slate-400" />}
        {state === 'loading' && <Loader2 size={36} className="text-blue-400 animate-spin" />}
        {state === 'success' && <CheckCircle size={36} className="text-emerald-400" />}
        {state === 'error'   && <AlertCircle size={36} className="text-red-400" />}
      </div>

      <div className="text-center">
        <h3 className="font-semibold text-slate-200 mb-1">Register Biometric</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          {msg || 'Use your device fingerprint or face unlock to register a biometric credential'}
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800 rounded-lg px-3 py-2">
        <Smartphone size={14} className="text-blue-400" />
        Android: fingerprint · Windows: Hello · Mac: Touch ID
      </div>

      <Btn variant="primary" onClick={register} loading={state === 'loading'} disabled={state === 'success'} className="w-full">
        <Fingerprint size={16} />
        {state === 'success' ? 'Biometric Registered' : 'Register Fingerprint / Face ID'}
      </Btn>
    </div>
  );
}

// ── Authenticate with biometric before signing ─────────────
export function BiometricAuth({ onSuccess, onSkip }) {
  const [state, setState] = useState('idle');
  const [msg, setMsg]     = useState('');

  const authenticate = async () => {
    setState('loading');
    setMsg('Requesting challenge...');
    try {
      const optRes = await authAPI.webauthnAuthOptions();
      const options = optRes.data;

      setMsg('Touch fingerprint sensor or look at camera...');

      const assertionResp = await startAuthentication(options);

      setMsg('Verifying identity...');
      const verifyRes = await authAPI.webauthnAuthVerify(assertionResp);

      setState('success');
      setMsg(`Identity verified · ${verifyRes.data.deviceName}`);
      toast.success('Biometric verified!');
      setTimeout(() => onSuccess?.({ deviceName: verifyRes.data.deviceName }), 800);
    } catch (err) {
      setState('error');
      const msg = err.response?.data?.error || err.message || 'Biometric failed';
      setMsg(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 p-6">
      <div className={`w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300
        ${state === 'idle'    ? 'bg-slate-700 border-2 border-slate-500 hover:border-blue-500 hover:bg-slate-600' : ''}
        ${state === 'loading' ? 'bg-blue-900/40 border-2 border-blue-500' : ''}
        ${state === 'success' ? 'bg-emerald-900/40 border-2 border-emerald-500' : ''}
        ${state === 'error'   ? 'bg-red-900/40 border-2 border-red-500' : ''}
      `}
        onClick={state === 'idle' || state === 'error' ? authenticate : undefined}
        style={state === 'loading' ? { animation: 'pulse 2s ease-in-out infinite' } : {}}
      >
        {state === 'idle'    && <Fingerprint size={40} className="text-slate-300" />}
        {state === 'loading' && <Loader2 size={40} className="text-blue-400 animate-spin" />}
        {state === 'success' && <CheckCircle size={40} className="text-emerald-400" />}
        {state === 'error'   && <AlertCircle size={40} className="text-red-400" />}
      </div>

      <div className="text-center space-y-1">
        <h3 className="font-semibold text-white text-lg">Biometric Verification Required</h3>
        <p className="text-sm text-slate-400">
          {state === 'idle' ? 'Tap the fingerprint icon to verify your identity before signing' : msg}
        </p>
      </div>

      <div className="w-full bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">How it works</p>
        {[
          { step: '1', text: 'Server sends a cryptographic challenge', done: state !== 'idle' },
          { step: '2', text: 'Device prompts for biometric', done: state === 'success' || state === 'loading' },
          { step: '3', text: 'Private key signs the challenge', done: state === 'success' },
          { step: '4', text: 'Server verifies with stored public key', done: state === 'success' },
        ].map(({ step, text, done }) => (
          <div key={step} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              ${done ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
              {done ? '✓' : step}
            </div>
            <span className={`text-xs ${done ? 'text-emerald-400' : 'text-slate-500'}`}>{text}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 w-full">
        <Btn variant="primary" onClick={authenticate} loading={state === 'loading'} disabled={state === 'success'} className="flex-1">
          <Fingerprint size={16} />
          {state === 'success' ? 'Verified ✓' : 'Verify Identity'}
        </Btn>
        {onSkip && (
          <Btn variant="ghost" onClick={onSkip} disabled={state === 'loading'} className="flex-1">
            Skip (use password)
          </Btn>
        )}
      </div>
    </div>
  );
}
