// src/pages/Security.js
import React, { useEffect, useState } from 'react';
import { auditAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner, Badge } from '../components/ui';
import { Shield, AlertTriangle, CheckCircle, Monitor, Clock, MapPin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function Security() {
  const { user } = useAuth();
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditAPI.mine()
      .then(r => setLogs(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32} /></div>;

  const loginLogs = logs.filter(l => ['login_success', 'login_failed', 'suspicious_activity'].includes(l.action));
  const knownDevices = user?.knownDevices || [];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-white">Security Overview</h1>
        <p className="text-sm text-slate-400 mt-0.5">Fraud detection, login history, and device management</p>
      </div>

      {/* Fraud detection summary */}
      <Card>
        <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Shield size={15} className="text-blue-400" /> Fraud Detection System
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Unusual Hours', desc: '1AM–5AM login = +20 risk', icon: Clock, color: 'text-amber-400' },
            { label: 'New IP Address', desc: 'Unknown IP = +25 risk', icon: MapPin, color: 'text-blue-400' },
            { label: 'New Device', desc: 'Unknown device = +20 risk', icon: Monitor, color: 'text-purple-400' },
            { label: 'Brute Force', desc: '3+ failures = +50 risk', icon: AlertTriangle, color: 'text-red-400' },
          ].map(({ label, desc, icon: Icon, color }) => (
            <div key={label} className="bg-slate-900 rounded-lg p-3 border border-slate-700 text-center">
              <Icon size={18} className={`${color} mx-auto mb-2`} />
              <p className="text-xs font-medium text-slate-300">{label}</p>
              <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 text-xs text-slate-400">
          <p><strong className="text-slate-300">Risk scoring:</strong> 0–30 = Allow · 31–59 = Warn user · 60+ = Block login</p>
          <p className="mt-1">Accounts with 5+ failed attempts are locked for 15 minutes automatically.</p>
        </div>
      </Card>

      {/* Known devices */}
      <Card>
        <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Monitor size={15} className="text-purple-400" /> Known Devices ({knownDevices.length})
        </h2>
        {knownDevices.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No device history yet</p>
        ) : (
          <div className="space-y-2">
            {knownDevices.map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Monitor size={15} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 break-all">{d.ua?.slice(0, 80)}...</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                    <span>{d.ip}</span>
                    {d.firstSeen && <span>First seen {format(new Date(d.firstSeen), 'MMM d, yyyy')}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Login history */}
      <Card>
        <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Clock size={15} className="text-blue-400" /> Login History
        </h2>
        {loginLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No login history</p>
        ) : (
          <div className="space-y-2">
            {loginLogs.map((log, i) => {
              const isOk  = log.action === 'login_success' && !log.isSuspicious;
              const isWarn = log.action === 'login_success' && log.isSuspicious;
              const isBad  = log.action === 'login_failed' || log.action === 'suspicious_activity';
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border animate-slideIn
                  ${isBad ? 'bg-red-900/10 border-red-800/40' : isWarn ? 'bg-amber-900/10 border-amber-800/40' : 'bg-slate-900 border-slate-700'}`}
                  style={{ animationDelay: `${i * 20}ms` }}>
                  <div className="mt-0.5">
                    {isOk  && <CheckCircle size={15} className="text-emerald-400" />}
                    {isWarn && <AlertTriangle size={15} className="text-amber-400" />}
                    {isBad  && <AlertTriangle size={15} className="text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-medium text-slate-300 capitalize">{log.action.replace(/_/g, ' ')}</p>
                      {log.isSuspicious && <Badge color="amber">Suspicious</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 flex-wrap">
                      {log.ipAddress && <span>{log.ipAddress}</span>}
                      <span>{formatDistanceToNow(new Date(log.createdAt))} ago</span>
                    </div>
                    {log.suspicionFlags?.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {log.suspicionFlags.map((f, fi) => (
                          <li key={fi} className="text-xs text-amber-400">⚠ {f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="text-xs text-slate-700 flex-shrink-0">{format(new Date(log.createdAt), 'MMM d HH:mm')}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
