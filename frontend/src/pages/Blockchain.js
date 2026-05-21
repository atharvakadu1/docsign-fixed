// src/pages/Blockchain.js
import React, { useEffect, useState } from 'react';
import { chainAPI } from '../services/api';
import { Card, Spinner, Btn, HashDisplay, Badge } from '../components/ui';
import { Cpu, CheckCircle, XCircle, RefreshCw, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Blockchain() {
  const [blocks, setBlocks]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [verify, setVerify]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [expanded, setExpanded]   = useState({});
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p = 1) => {
    try {
      const [chainRes, statsRes] = await Promise.all([chainAPI.chain(p), chainAPI.stats()]);
      setBlocks(chainRes.data.blocks);
      setTotalPages(chainRes.data.pages);
      setStats(statsRes.data);
    } catch { toast.error('Failed to load blockchain'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  const runVerify = async () => {
    setVerifying(true);
    try {
      const res = await chainAPI.verify();
      setVerify(res.data);
      toast.success(res.data.valid ? 'Chain is valid!' : 'Chain integrity issues detected!');
    } catch { toast.error('Verification failed'); }
    finally { setVerifying(false); }
  };

  const toggle = (i) => setExpanded(p => ({ ...p, [i]: !p[i] }));

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32} /></div>;

  const actionColors = { genesis: 'gray', uploaded: 'blue', signed: 'green', verified: 'purple' };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Blockchain Ledger</h1>
          <p className="text-sm text-slate-400 mt-0.5">Immutable record of all document actions</p>
        </div>
        <Btn variant="primary" onClick={runVerify} loading={verifying}>
          <RefreshCw size={14} /> Verify Chain Integrity
        </Btn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Blocks',     value: stats?.totalBlocks ?? '—',   color: 'text-purple-400' },
          { label: 'Signature Blocks', value: stats?.signatureBlocks ?? '—', color: 'text-emerald-400' },
          { label: 'Latest Index',     value: stats?.latestIndex ?? '—',   color: 'text-blue-400' },
          { label: 'Chain Status',     value: verify ? (verify.valid ? 'Valid ✓' : 'Error ✗') : 'Not verified', color: verify ? (verify.valid ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Verification result */}
      {verify && (
        <div className={`rounded-xl p-4 border animate-fadeIn ${verify.valid ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
          <div className="flex items-center gap-3 mb-2">
            {verify.valid ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-red-400" />}
            <p className={`font-medium ${verify.valid ? 'text-emerald-300' : 'text-red-300'}`}>{verify.message}</p>
          </div>
          <p className="text-xs text-slate-500">{verify.totalBlocks} blocks checked · Each block's hash recomputed and verified against stored value</p>
        </div>
      )}

      {/* Block list */}
      <Card padding={false}>
        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
          <Cpu size={15} className="text-purple-400" />
          <h2 className="font-semibold text-slate-200 text-sm">Chain — most recent first</h2>
        </div>
        <div className="divide-y divide-slate-700">
          {blocks.map((block, i) => (
            <div key={block.index} className="animate-slideIn" style={{ animationDelay: `${i * 30}ms` }}>
              {/* Block header — always visible */}
              <button onClick={() => toggle(block.index)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-750 transition-all text-left">
                <div className="w-9 h-9 bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold font-mono text-purple-400">#{block.index}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Badge color={actionColors[block.action] || 'gray'}>{block.action}</Badge>
                    <span className="text-sm text-slate-300 truncate">{block.signerName || block.signer}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-500 truncate">
                    {block.currentHash?.slice(0, 20)}...
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-600 hidden sm:block">{format(new Date(block.timestamp), 'MMM d HH:mm')}</span>
                  {expanded[block.index] ? <ChevronUp size={15} className="text-slate-500" /> : <ChevronDown size={15} className="text-slate-500" />}
                </div>
              </button>

              {/* Expanded block details */}
              {expanded[block.index] && (
                <div className="px-4 pb-4 bg-slate-900/50 animate-fadeIn">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-700">
                        <p className="text-slate-500 mb-1">Signer</p>
                        <p className="text-slate-300">{block.signerName || block.signer}</p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-700">
                        <p className="text-slate-500 mb-1">Timestamp</p>
                        <p className="font-mono text-slate-300">{format(new Date(block.timestamp), 'yyyy-MM-dd HH:mm:ss')}</p>
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-700">
                      <p className="text-slate-500 mb-1">Document Hash (input to this block)</p>
                      <p className="font-mono text-emerald-400 break-all">{block.docHash}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-700">
                      <p className="text-slate-500 mb-1 flex items-center gap-1"><Link2 size={10} /> Previous Block Hash</p>
                      <p className="font-mono text-slate-400 break-all">{block.previousHash}</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-2.5 border border-blue-800/50">
                      <p className="text-slate-500 mb-1">Current Block Hash (SHA-256)</p>
                      <p className="font-mono text-blue-400 break-all">{block.currentHash}</p>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700">
                      <p className="text-slate-500 mb-1 text-xs">How this hash was computed:</p>
                      <p className="font-mono text-slate-500 text-xs break-all">
                        SHA256({block.index} | {block.docHash?.slice(0,8)}... | {block.signer} | {new Date(block.timestamp).toISOString()} | {block.previousHash?.slice(0,8)}... | {block.nonce})
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-4 border-t border-slate-700">
            <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Btn>
            <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
            <Btn variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
