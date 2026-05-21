// src/pages/DocDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { docAPI, sigAPI, chainAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Btn, HashDisplay, StatusBadge, Spinner, Avatar, Badge } from '../components/ui';
import { BiometricAuth } from '../components/BiometricButton';
import {
  FileText, Hash, Shield, Cpu, QrCode, Clock,
  CheckCircle, XCircle, Fingerprint, ChevronLeft,
  AlertCircle, Link2, ArrowRight, Eye, Download, Lock
} from 'lucide-react';
import { format } from 'date-fns';

export default function DocDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doc, setDoc]           = useState(null);
  const [requests, setRequests] = useState([]);
  const [blocks, setBlocks]     = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('overview');
  const [signing, setSigning]   = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ── Auth-method state ──────────────────────────────────────────────────────
  // 'idle' | 'biometric' | 'password' | 'done'
  const [signStep, setSignStep]       = useState('idle');
  const [bioVerified, setBioVerified] = useState(false);
  const [bioDevice, setBioDevice]     = useState('');

  // Password fallback
  const [password, setPassword]         = useState('');
  const [pwdError, setPwdError]         = useState('');
  const [pwdChecking, setPwdChecking]   = useState(false);

  // Reject
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject]     = useState(false);

  const load = async () => {
    try {
      const [docRes, blocksRes, auditRes] = await Promise.all([
        docAPI.getOne(id),
        chainAPI.docBlocks(id),
        docAPI.audit(id),
      ]);
      setDoc(docRes.data.document);
      setRequests(docRes.data.signatureRequests);
      setBlocks(blocksRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      toast.error('Failed to load document');
      navigate('/my-docs');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const myRequest = requests.find(r => r.signerId?._id === user?._id || r.signerId === user?._id);

  const downloadSigned = async () => {
    setDownloading(true);
    try {
      const res = await docAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { window.URL.revokeObjectURL(url); document.body.removeChild(a); }, 200);
      toast.success('Download started!');
    } catch (err) {
      toast.error('Download failed');
    } finally { setDownloading(false); }
  };

  const token = localStorage.getItem('ds_token');
  const pdfViewUrl = `${process.env.REACT_APP_API_URL || '/api'}/documents/${id}/view?token=${token}`;

  // ── Called after auth is confirmed (biometric or password) ─────────────────
  const executeSign = async ({ authMethod, deviceName }) => {
    if (!myRequest) return;
    setSigning(true);
    try {
      await sigAPI.sign(myRequest._id, {
        authMethod,
        biometricVerified: authMethod === 'biometric',
        deviceName: deviceName || '',
        // password is sent only for password fallback — backend verifies it
        ...(authMethod === 'password' && { password }),
      });
      toast.success('Document signed successfully!');
      // reset all auth state
      setBioVerified(false); setBioDevice(''); setPassword('');
      setPwdError(''); setSignStep('idle');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signing failed');
    } finally { setSigning(false); }
  };

  // ── "Sign Document" button handler ─────────────────────────────────────────
  // Always open the biometric modal first. Password is only offered as fallback
  // from inside that modal.
  const handleSignClick = () => {
    setPassword(''); setPwdError(''); setBioVerified(false);
    setSignStep('biometric');
  };

  // ── Biometric succeeded ────────────────────────────────────────────────────
  const handleBioSuccess = ({ deviceName }) => {
    setBioVerified(true);
    setBioDevice(deviceName || 'device');
    setSignStep('idle');
    executeSign({ authMethod: 'biometric', deviceName });
  };

  // ── User chose to fall back to password ───────────────────────────────────
  const handleBioSkip = () => {
    setSignStep('password');
  };

  // ── Password form submit ───────────────────────────────────────────────────
  const handlePasswordSign = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setPwdError('Password is required.'); return; }
    setPwdChecking(true); setPwdError('');
    try {
      await executeSign({ authMethod: 'password' });
    } catch {
      // executeSign already toasts; surface field error too
      setPwdError('Incorrect password. Please try again.');
    } finally { setPwdChecking(false); }
  };

  const reject = async () => {
    if (!myRequest || !rejectReason.trim()) return toast.error('Please provide a rejection reason');
    try {
      await sigAPI.reject(myRequest._id, { reason: rejectReason });
      toast.success('Request rejected');
      setShowReject(false); load();
    } catch (err) { toast.error('Failed to reject'); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32} /></div>;
  if (!doc) return null;

  const canSign = myRequest && ['pending', 'viewed'].includes(myRequest.status);
  const isSigned = doc.status === 'completed' || doc.status === 'partially_signed' ||
    requests.some(r => r.status === 'signed');
  const tabs = ['overview', 'document', 'hashing', 'blockchain', 'audit', 'qr'];

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fadeIn">
      {/* Back + header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1 mt-1">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-xl font-bold text-white truncate">{doc.title}</h1>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-sm text-slate-400">
            Uploaded by {doc.authorId?.name} · {format(new Date(doc.createdAt), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        <Btn variant="outline" size="sm" onClick={() => window.open(doc.verifyUrl, '_blank')}>
          <QrCode size={13} /> Verify
        </Btn>
        <Btn variant="outline" size="sm" loading={downloading} onClick={downloadSigned}>
          <Download size={13} /> Download PDF
        </Btn>
      </div>

      {/* ── Sign action banner ── */}
      {canSign && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-blue-300 mb-0.5">Your signature is required</p>
            <p className="text-xs text-slate-400">
              Biometric verification is required first. If unavailable, you may re-enter your password.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="success" size="sm" loading={signing} onClick={handleSignClick}>
              <CheckCircle size={13} /> Sign Document
            </Btn>
            <Btn variant="danger" size="sm" onClick={() => setShowReject(!showReject)}>
              <XCircle size={13} /> Reject
            </Btn>
          </div>
        </div>
      )}

      {/* ── Biometric modal ── */}
      {signStep === 'biometric' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Fingerprint size={16} className="text-blue-400" /> Biometric Verification
              </h3>
              <button
                onClick={() => setSignStep('idle')}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle size={18} />
              </button>
            </div>
            <BiometricAuth
              onSuccess={handleBioSuccess}
              onSkip={handleBioSkip}
            />
          </div>
        </div>
      )}

      {/* ── Password fallback modal ── */}
      {signStep === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Lock size={16} className="text-amber-400" /> Confirm Your Password
              </h3>
              <button
                onClick={() => { setSignStep('idle'); setPassword(''); setPwdError(''); }}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSign} className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/40 rounded-lg p-3">
                <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Biometric was skipped or unavailable. You must re-enter your account password to sign this document. This is recorded in the audit trail.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Account Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPwdError(''); }}
                  placeholder="Enter your password"
                  autoFocus
                  className={`w-full px-3 py-2.5 bg-slate-800 border rounded-lg text-sm text-slate-200
                    placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors
                    ${pwdError
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-600 focus:ring-blue-500/30 focus:border-blue-500'}`}
                />
                {pwdError && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} /> {pwdError}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Btn
                  type="submit"
                  variant="success"
                  className="flex-1"
                  loading={pwdChecking || signing}
                  disabled={!password.trim()}
                >
                  <CheckCircle size={14} /> Sign with Password
                </Btn>
                <Btn
                  type="button"
                  variant="ghost"
                  onClick={() => { setSignStep('biometric'); setPassword(''); setPwdError(''); }}
                  disabled={pwdChecking || signing}
                >
                  Try Biometric
                </Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject form ── */}
      {showReject && (
        <Card className="border-red-700/40 animate-fadeIn">
          <p className="text-sm font-medium text-red-400 mb-3">Rejection reason (required)</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Explain why you are rejecting this signature request..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-3" />
          <div className="flex gap-2">
            <Btn variant="danger" size="sm" onClick={reject}>Confirm Rejection</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setShowReject(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* ── Signed status banner ── */}
      {isSigned && (
        <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap animate-fadeIn">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                Signed with DocSign
                {doc.status === 'completed' && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-600/40">
                    Fully Complete
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {requests.filter(r => r.status === 'signed').map(r => r.signerId?.name).filter(Boolean).join(', ')}
                {requests.filter(r => r.status === 'signed').length > 0 && ' · '}
                Hash-chained &amp; blockchain recorded
              </p>
            </div>
          </div>
          <Btn variant="outline" size="sm" loading={downloading} onClick={downloadSigned}
            className="border-emerald-600/50 text-emerald-300 hover:border-emerald-500 hover:text-emerald-200 flex-shrink-0">
            <Download size={13} /> Download Signed PDF
          </Btn>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium capitalize transition-all
              ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'qr' ? 'QR Code' : t === 'document' ? 'View PDF' : t}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          <Card>
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <FileText size={15} className="text-blue-400" /> Document Info
            </h3>
            <div className="space-y-3 text-sm">
              {[
                ['Title',      doc.title],
                ['Description',doc.description || '—'],
                ['File name',  doc.fileName],
                ['File size',  doc.fileSize ? `${(doc.fileSize/1024).toFixed(1)} KB` : '—'],
                ['Algorithm',  doc.hashAlgorithm],
                ['Status',     null],
                ['Expires',    doc.expiresAt ? format(new Date(doc.expiresAt), 'MMM d, yyyy') : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-slate-500 flex-shrink-0">{k}</span>
                  {k === 'Status' ? <StatusBadge status={doc.status} /> : <span className="text-slate-300 text-right break-all">{v}</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Shield size={15} className="text-purple-400" /> Signature Policy
            </h3>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Policy</span>
                <Badge color="purple">
                  {doc.signatureConfig?.type === 'all' ? 'All must sign' : `${doc.signatureConfig?.threshold} of ${requests.length}`}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total signers</span>
                <span className="text-slate-300">{requests.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Signed</span>
                <span className="text-emerald-400 font-medium">{requests.filter(r => r.status === 'signed').length}</span>
              </div>
            </div>

            <div className="space-y-2">
              {requests.map((req, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-900 rounded-lg border border-slate-700">
                  <Avatar name={req.signerId?.name || '?'} size={7} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{req.signerId?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{req.signerId?.email}</p>
                    {req.status === 'signed' && req.signedAt && (
                      <p className="text-xs text-emerald-400 mt-0.5">Signed {format(new Date(req.signedAt), 'MMM d HH:mm')} · {req.authMethod}</p>
                    )}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Document Viewer ── */}
      {tab === 'document' && (
        <div className="animate-fadeIn space-y-3">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Eye size={15} className="text-blue-400" /> Document Preview
              </h3>
              <div className="flex items-center gap-2">
                {isSigned && (
                  <span className="flex items-center gap-1.5 text-xs bg-emerald-900/30 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-700/40">
                    <CheckCircle size={11} /> Signed
                  </span>
                )}
                <Btn variant="outline" size="sm" loading={downloading} onClick={downloadSigned}>
                  <Download size={13} /> Download
                </Btn>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
              style={{ height: '75vh', minHeight: '500px' }}>
              <object
                data={pdfViewUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                className="block"
              >
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <FileText size={48} className="text-slate-600" />
                  <div>
                    <p className="text-slate-300 font-medium mb-1">PDF preview not available</p>
                    <p className="text-slate-500 text-sm mb-4">Your browser may be blocking inline PDF viewing.</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Btn variant="primary" size="sm" onClick={() => window.open(pdfViewUrl, '_blank')}>
                        <Eye size={13} /> Open in New Tab
                      </Btn>
                      <Btn variant="outline" size="sm" loading={downloading} onClick={downloadSigned}>
                        <Download size={13} /> Download PDF
                      </Btn>
                    </div>
                  </div>
                </div>
              </object>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">
              Viewing: {doc.fileName} · {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}
            </p>
          </Card>
        </div>
      )}

      {/* ── Tab: Hashing ── */}
      {tab === 'hashing' && (
        <div className="space-y-4 animate-fadeIn">
          <Card>
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-2">
              <Hash size={15} className="text-emerald-400" /> SHA-256 Document Integrity
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              The original document hash is computed on upload using SHA-256.
              Each signature extends the hash chain: <span className="font-mono text-slate-400">H_n = SHA256(H_(n-1) + signerEmail)</span>
            </p>
            <HashDisplay hash={doc.originalHash} label="Original SHA-256 (upload)" />
            <div className="my-3 flex items-center gap-2 text-xs text-slate-500">
              <ArrowRight size={12} /> Hash chain evolution
            </div>
            <div className="space-y-2">
              {doc.hashChain?.map((entry, i) => (
                <div key={i} className="animate-slideIn" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700/50 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
                      H{i}
                    </div>
                    <div>
                      <span className="text-xs text-slate-300 font-medium">{entry.note || (i === 0 ? 'Document uploaded' : `Signed by ${entry.signerName}`)}</span>
                      {entry.signerEmail && i > 0 && (
                        <span className="text-xs text-slate-500 ml-2 font-mono">SHA256(H{i-1} + {entry.signerEmail})</span>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-slate-600">{format(new Date(entry.createdAt), 'HH:mm:ss')}</span>
                  </div>
                  <div className="ml-8 bg-slate-900 rounded-lg p-2.5 border border-slate-700">
                    <p className="font-mono text-xs text-emerald-400 break-all">{entry.hash}</p>
                  </div>
                  {i < doc.hashChain.length - 1 && (
                    <div className="ml-10 my-1 text-slate-600 text-xs flex items-center gap-1">
                      <ArrowRight size={11} />
                      <span className="font-mono">SHA256(above + next_signer_email)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Blockchain ── */}
      {tab === 'blockchain' && (
        <div className="space-y-4 animate-fadeIn">
          <Card>
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-2">
              <Cpu size={15} className="text-purple-400" /> Blockchain Blocks for this Document
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Each action (upload, signature) creates an immutable block with the previous block's hash, making tampering detectable.
            </p>
            {blocks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No blocks yet</p>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, i) => (
                  <div key={block.index} className="animate-slideIn" style={{ animationDelay: `${i * 60}ms` }}>
                    {i > 0 && (
                      <div className="flex items-center gap-2 my-2 ml-4 text-xs text-slate-600 font-mono">
                        <Link2 size={11} className="text-purple-700" />
                        <span>previousHash → {block.previousHash?.slice(0, 16)}...</span>
                      </div>
                    )}
                    <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-purple-900/40 rounded-lg flex items-center justify-center">
                            <Cpu size={13} className="text-purple-400" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-purple-400 font-mono">Block #{block.index}</span>
                            <span className="ml-2 text-xs text-slate-500 capitalize">{block.action}</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-600">{format(new Date(block.timestamp), 'MMM d HH:mm:ss')}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Signer:</span><span className="text-slate-300">{block.signerName || block.signer}</span></div>
                        <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Doc hash:</span><span className="font-mono text-emerald-400 break-all">{block.docHash?.slice(0, 32)}...</span></div>
                        <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Prev hash:</span><span className="font-mono text-slate-500 break-all">{block.previousHash?.slice(0, 32)}...</span></div>
                        <div className="flex gap-2"><span className="text-slate-500 w-24 flex-shrink-0">Block hash:</span><span className="font-mono text-blue-400 break-all">{block.currentHash?.slice(0, 32)}...</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Audit ── */}
      {tab === 'audit' && (
        <Card className="animate-fadeIn">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Clock size={15} className="text-blue-400" /> Full Audit Trail
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No events yet</p>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-700" />
              <div className="space-y-4 pl-8">
                {auditLogs.map((log, i) => {
                  const isGood = log.action.includes('success') || log.action.includes('complet') || log.action.includes('signed') || log.action.includes('verified');
                  const isBad  = log.action.includes('fail') || log.action.includes('suspicious') || log.action.includes('mismatch') || log.action.includes('rejected');
                  return (
                    <div key={i} className="relative animate-slideIn" style={{ animationDelay: `${i * 30}ms` }}>
                      <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 border-slate-900
                        ${isGood ? 'bg-emerald-500' : isBad ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-200">{log.description || log.action.replace(/_/g, ' ')}</p>
                          <span className="text-xs text-slate-600 flex-shrink-0">{format(new Date(log.createdAt), 'MMM d HH:mm:ss')}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {log.userId && <span className="text-xs text-slate-500">{log.userId.name || log.userId.email}</span>}
                          {log.ipAddress && <span className="text-xs font-mono text-slate-600">{log.ipAddress}</span>}
                          {log.isSuspicious && (
                            <span className="text-xs bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertCircle size={10} /> Suspicious
                            </span>
                          )}
                        </div>
                        {log.suspicionFlags?.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {log.suspicionFlags.map((f, fi) => (
                              <li key={fi} className="text-xs text-amber-400">⚠ {f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: QR ── */}
      {tab === 'qr' && (
        <Card className="animate-fadeIn">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <QrCode size={15} className="text-blue-400" /> QR Verification Code
          </h3>
          <div className="flex flex-col items-center gap-5">
            {doc.qrCodeBase64 ? (
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <img src={doc.qrCodeBase64} alt="QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                <QrCode size={48} className="text-slate-600" />
              </div>
            )}
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-slate-300">Scan to verify this document</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Anyone can scan this QR code to verify the document's integrity, signers, and blockchain history — no login required.
              </p>
              {doc.verifyUrl && (
                <a href={doc.verifyUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-mono break-all block">{doc.verifyUrl}</a>
              )}
            </div>
            <Btn variant="outline" onClick={() => window.open(doc.verifyUrl, '_blank')}>
              <QrCode size={14} /> Open Verification Page
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
