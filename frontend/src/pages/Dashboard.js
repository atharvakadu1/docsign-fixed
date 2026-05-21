// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { docAPI, chainAPI, auditAPI } from '../services/api';
import { Card, Spinner, StatusBadge, Btn, HashDisplay } from '../components/ui';
import { FileText, PenLine, Cpu, Shield, TrendingUp, Clock, Upload, CheckCircle, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [recent, setRecent] = useState([]);
  const [chain, setChain]   = useState(null);
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [myDocs, pendingRes, chainRes, auditRes] = await Promise.all([
          docAPI.myDocs(),
          docAPI.pending(),
          chainAPI.stats(),
          auditAPI.mine(),
        ]);

        const docs = myDocs.data;
        setRecent(docs.slice(0, 5));
        setStats({
          myDocs:   docs.length,
          pending:  pendingRes.data.length,
          signed:   docs.filter(d => d.status === 'completed').length,
          totalBlocks: chainRes.data.totalBlocks,
        });
        setChain(chainRes.data);
        setLogs(auditRes.data.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32} /></div>;

  const statCards = [
    { icon: FileText, label: 'My Documents', value: stats?.myDocs ?? 0,    color: 'blue',  to: '/my-docs' },
    { icon: PenLine,  label: 'Pending Signs', value: stats?.pending ?? 0,   color: 'amber', to: '/pending' },
    { icon: CheckCircle, label: 'Completed', value: stats?.signed ?? 0,     color: 'green', to: '/my-docs' },
    { icon: Cpu,      label: 'Chain Blocks', value: stats?.totalBlocks ?? 0, color: 'purple',to: '/blockchain' },
  ];

  const colorMap = { blue: 'text-blue-400 bg-blue-900/30', amber: 'text-amber-400 bg-amber-900/30', green: 'text-emerald-400 bg-emerald-900/30', purple: 'text-purple-400 bg-purple-900/30' };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-400 text-sm">Manage your documents with blockchain-backed security</p>
        </div>
        <Btn variant="primary" onClick={() => navigate('/my-docs')}>
          <Upload size={16} /> Upload Document
        </Btn>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color, to }) => (
          <button key={label} onClick={() => navigate(to)}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 hover:bg-slate-750 transition-all group">
            <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
              <Icon size={20} className={colorMap[color].split(' ')[0]} />
            </div>
            <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent documents */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                <FileText size={16} className="text-blue-400" /> Recent Documents
              </h2>
              <button onClick={() => navigate('/my-docs')} className="text-xs text-blue-400 hover:text-blue-300">View all</button>
            </div>
            {recent.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No documents yet. Upload your first one!</p>
            ) : (
              <div className="space-y-3">
                {recent.map((doc) => (
                  <button key={doc._id} onClick={() => navigate(`/doc/${doc._id}`)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-900 hover:bg-slate-850 rounded-lg border border-slate-700 hover:border-slate-600 transition-all text-left group">
                    <div className="w-9 h-9 bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{doc.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {doc.signedCount}/{doc.totalSigners} signed · {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Blockchain status */}
          <Card>
            <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-purple-400" /> Blockchain
            </h2>
            {chain && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Total blocks</span>
                  <span className="text-sm font-mono font-medium text-purple-400">{chain.totalBlocks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Signatures recorded</span>
                  <span className="text-sm font-mono font-medium text-green-400">{chain.signatureBlocks}</span>
                </div>
                {chain.latestHash && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Latest block hash</p>
                    <p className="font-mono text-xs text-slate-400 break-all">{chain.latestHash?.slice(0, 20)}...</p>
                  </div>
                )}
                <Btn variant="outline" size="sm" className="w-full" onClick={() => navigate('/blockchain')}>
                  <Cpu size={13} /> View Blockchain
                </Btn>
              </div>
            )}
          </Card>

          {/* Audit log */}
          <Card>
            <h2 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Activity size={16} className="text-blue-400" /> Recent Activity
            </h2>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-2.5">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0
                      ${log.action.includes('success') || log.action.includes('complet') ? 'bg-emerald-400' :
                        log.action.includes('fail') || log.action.includes('suspicious') ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">{log.description || log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-600">{format(new Date(log.createdAt), 'MMM d, HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
