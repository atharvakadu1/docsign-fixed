// src/pages/VerifyPage.js
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyAPI } from '../services/api';
import { Spinner, HashDisplay, StatusBadge, Avatar } from '../components/ui';
import { Shield, CheckCircle, XCircle, Hash, Cpu, Users, FileText, QrCode, Link2 } from 'lucide-react';
import { format } from 'date-fns';

export default function VerifyPage() {
  const { docId } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    verifyAPI.verify(docId)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Document not found'))
      .finally(() => setLoading(false));
  }, [docId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Spinner size={36} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Document Not Found</h1>
        <p className="text-slate-400 text-sm">{error}</p>
        <Link to="/" className="text-blue-400 text-sm mt-4 block">← Back to DocSign</Link>
      </div>
    </div>
  );

  const { document: doc, integrity, signatures, blockchain, summary } = data;
  const allGood = summary?.allVerified && doc.status === 'completed';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">DocSign Verification</p>
            <p className="text-xs text-slate-500">Public document integrity portal</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-5 animate-fadeIn">
        {/* Overall result banner */}
        <div className={`rounded-2xl p-5 border flex items-center gap-4
          ${allGood ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-amber-900/20 border-amber-700/40'}`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
            ${allGood ? 'bg-emerald-900/50' : 'bg-amber-900/50'}`}>
            {allGood ? <CheckCircle size={28} className="text-emerald-400" /> : <XCircle size={28} className="text-amber-400" />}
          </div>
          <div>
            <h1 className="font-bold text-white text-lg mb-0.5">
              {allGood ? 'Document Verified ✓' : 'Verification Incomplete'}
            </h1>
            <p className="text-sm text-slate-400">
              {allGood
                ? 'This document is authentic, unmodified, and fully signed'
                : 'Some verification checks did not pass — see details below'}
            </p>
          </div>
        </div>

        {/* Document info */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-semibold text-white">{doc.title}</h2>
                <StatusBadge status={doc.status} />
              </div>
              <p className="text-xs text-slate-400 mb-2">{doc.description}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span>Author: {doc.author?.name}</span>
                <span>Uploaded: {format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                <span>Algorithm: {doc.hashAlgorithm}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification checks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              icon: Hash, title: 'File Integrity',
              ok: integrity.fileVerified,
              desc: integrity.fileMessage,
              color: 'emerald',
            },
            {
              icon: Link2, title: 'Hash Chain',
              ok: integrity.hashChainValid,
              desc: integrity.hashChainMessage,
              color: 'blue',
            },
            {
              icon: Cpu, title: 'Blockchain',
              ok: blockchain.valid !== false,
              desc: `${blockchain.blockCount || 0} blocks recorded`,
              color: 'purple',
            },
          ].map(({ icon: Icon, title, ok, desc, color }) => (
            <div key={title} className={`rounded-xl p-4 border
              ${ok ? `bg-${color}-900/15 border-${color}-700/40` : 'bg-red-900/15 border-red-700/40'}`}>
              <div className="flex items-center gap-2 mb-2">
                {ok ? <CheckCircle size={15} className={`text-${color}-400`} /> : <XCircle size={15} className="text-red-400" />}
                <p className="text-sm font-medium text-slate-200">{title}</p>
              </div>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Hashes */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
            <Hash size={14} className="text-emerald-400" /> SHA-256 Hashes
          </h3>
          <HashDisplay hash={integrity.originalHash} label="Original document hash (SHA-256)" />
          {integrity.originalHash !== integrity.currentHash && (
            <HashDisplay hash={integrity.currentHash} label="Current hash (after all signatures)" />
          )}
        </div>

        {/* Signers */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm mb-3">
            <Users size={14} className="text-blue-400" /> Signers ({summary.signedCount}/{summary.totalSigners})
          </h3>
          <div className="space-y-2">
            {signatures.map((sig, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-900 rounded-lg border border-slate-700">
                <Avatar name={sig.signerName || '?'} size={7} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{sig.signerName}</p>
                  <p className="text-xs text-slate-500">{sig.signerEmail}</p>
                  {sig.status === 'signed' && (
                    <p className="text-xs text-emerald-400 mt-0.5">
                      Signed {format(new Date(sig.signedAt), 'MMM d, yyyy HH:mm')} · {sig.authMethod}
                      {sig.deviceName ? ` · ${sig.deviceName}` : ''}
                    </p>
                  )}
                  {sig.status === 'signed' && sig.signatureHash && (
                    <p className="text-xs font-mono text-slate-600 mt-0.5 truncate">Hash: {sig.signatureHash?.slice(0, 20)}...</p>
                  )}
                </div>
                <StatusBadge status={sig.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Blockchain blocks */}
        {blockchain.blocks?.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-sm mb-3">
              <Cpu size={14} className="text-purple-400" /> Blockchain History
            </h3>
            <div className="space-y-2">
              {blockchain.blocks.map((b, i) => (
                <div key={i} className="p-3 bg-slate-900 rounded-lg border border-slate-700 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-purple-400">Block #{b.index}</span>
                    <span className="text-slate-600">{format(new Date(b.timestamp), 'MMM d HH:mm')}</span>
                  </div>
                  <div className="space-y-1 text-slate-500">
                    <div className="flex gap-2"><span className="w-14 flex-shrink-0">Action:</span><span className="capitalize text-slate-300">{b.action}</span></div>
                    <div className="flex gap-2"><span className="w-14 flex-shrink-0">Signer:</span><span className="text-slate-300">{b.signer}</span></div>
                    <div className="flex gap-2"><span className="w-14 flex-shrink-0">Hash:</span><span className="font-mono text-blue-400 break-all">{b.fullHash}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-600 pb-4">
          Verified by DocSign · SHA-256 · WebAuthn FIDO2 · Blockchain integrity
          <br />Document ID: <span className="font-mono">{docId}</span>
        </div>
      </div>
    </div>
  );
}
