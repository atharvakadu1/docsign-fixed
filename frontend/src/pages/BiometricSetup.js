// src/pages/BiometricSetup.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Btn, Badge } from '../components/ui';
import { BiometricRegister, BiometricAuth } from '../components/BiometricButton';
import { Fingerprint, CheckCircle, Smartphone, Info, Shield } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function BiometricSetup() {
  const { user, refreshUser } = useAuth();
  const [testing, setTesting] = useState(false);
  const [tested, setTested]   = useState(false);

  const creds = user?.webauthnCredentials || [];

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-white">Biometric Authentication</h1>
        <p className="text-sm text-slate-400 mt-0.5">Register your fingerprint or face ID for document signing</p>
      </div>

      {/* Status card */}
      <div className={`rounded-xl p-4 border flex items-center gap-4
        ${user?.biometricEnabled ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-slate-800 border-slate-700'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center
          ${user?.biometricEnabled ? 'bg-emerald-900/40' : 'bg-slate-700'}`}>
          <Fingerprint size={24} className={user?.biometricEnabled ? 'text-emerald-400' : 'text-slate-400'} />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-200">
            {user?.biometricEnabled ? 'Biometric Authentication Active' : 'No Biometric Registered'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {user?.biometricEnabled
              ? `${creds.length} credential${creds.length !== 1 ? 's' : ''} registered`
              : 'Register your device biometric to enable secure document signing'}
          </p>
        </div>
        {user?.biometricEnabled && <CheckCircle size={20} className="text-emerald-400" />}
      </div>

      {/* How it works */}
      <Card>
        <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Info size={15} className="text-blue-400" /> How WebAuthn Works
        </h2>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Register once', desc: 'Your device creates a public/private key pair. The private key never leaves your device.', color: 'bg-blue-600' },
            { step: '2', title: 'Server stores public key', desc: 'Only the public key is stored on the server — useless without the private key.', color: 'bg-purple-600' },
            { step: '3', title: 'Sign with biometric', desc: 'When signing a document, the server sends a challenge. Your biometric unlocks the private key to sign it.', color: 'bg-emerald-600' },
            { step: '4', title: 'Server verifies', desc: 'The server verifies the signature using the stored public key — proving it was you.', color: 'bg-amber-600' },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="flex gap-3">
              <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5`}>{step}</div>
              <div>
                <p className="text-sm font-medium text-slate-200">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-700 flex items-start gap-2">
          <Smartphone size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Supported on Android:</strong> Use Chrome on Android with your fingerprint sensor.
            The biometric never leaves your device — it only proves you physically have the device.
          </p>
        </div>
      </Card>

      {/* Registered credentials */}
      {creds.length > 0 && (
        <Card>
          <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Shield size={15} className="text-purple-400" /> Registered Devices
          </h2>
          <div className="space-y-2">
            {creds.map((cred, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                <div className="w-9 h-9 bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Fingerprint size={18} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{cred.deviceName || 'Device'}</p>
                  <p className="text-xs text-slate-500">
                    Registered {cred.registeredAt ? format(new Date(cred.registeredAt), 'MMM d, yyyy') : '—'}
                    {cred.backedUp && ' · Backed up'}
                  </p>
                </div>
                <Badge color="green">Active</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Register new biometric */}
      <Card>
        <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-1">
          <Fingerprint size={15} className="text-blue-400" />
          {creds.length > 0 ? 'Register Another Device' : 'Register Biometric'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Each device must be registered separately. Register the device you'll use to sign documents.
        </p>
        <BiometricRegister onSuccess={() => refreshUser()} />
      </Card>

      {/* Test biometric */}
      {creds.length > 0 && (
        <Card>
          <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-1">
            <CheckCircle size={15} className="text-emerald-400" /> Test Authentication
          </h2>
          <p className="text-xs text-slate-500 mb-4">Verify your biometric is working correctly before signing documents.</p>
          {testing ? (
            <BiometricAuth
              onSuccess={() => { setTesting(false); setTested(true); toast.success('Biometric test passed!'); }}
              onSkip={() => setTesting(false)}
            />
          ) : (
            <div className="flex items-center gap-3">
              <Btn variant="outline" onClick={() => setTesting(true)}>
                <Fingerprint size={14} /> Test Biometric
              </Btn>
              {tested && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Test passed</span>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
