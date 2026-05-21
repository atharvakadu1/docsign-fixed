// src/pages/MyDocs.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { docAPI, authAPI } from '../services/api';
import { Card, Btn, Input, StatusBadge, Spinner, Empty, Avatar } from '../components/ui';
import {
  Upload, FileText, X, Plus, Trash2, Eye, ChevronDown,
  CheckCircle, Hash, Users, Settings2, Search
} from 'lucide-react';
import { format } from 'date-fns';

export default function MyDocs() {
  const navigate = useNavigate();
  const [docs, setDocs]         = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState('');
  const [file, setFile]         = useState(null);
  const [drag, setDrag]         = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', signerIds: [],
    signatureType: 'all', threshold: 2,
  });

  const load = useCallback(async () => {
    try {
      const [docsRes, usersRes] = await Promise.all([docAPI.myDocs(), authAPI.users()]);
      setDocs(docsRes.data);
      setUsers(usersRes.data);
    } catch (err) { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (f?.type === 'application/pdf') {
      setFile(f);
      if (!form.title) setForm(p => ({ ...p, title: f.name.replace('.pdf', '') }));
    } else toast.error('Only PDF files are allowed');
  };

  const toggleSigner = (id) => {
    setForm(p => ({
      ...p,
      signerIds: p.signerIds.includes(id)
        ? p.signerIds.filter(s => s !== id)
        : [...p.signerIds, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a PDF file');
    if (!form.title.trim()) return toast.error('Document title required');
    setUploading(true); setProgress(0);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('signerIds', JSON.stringify(form.signerIds));
      fd.append('signatureType', form.signatureType);
      fd.append('threshold', form.threshold);
      await docAPI.upload(fd, setProgress);
      toast.success('Document uploaded, hashed & added to blockchain!');
      setShowForm(false); setFile(null);
      setForm({ title: '', description: '', signerIds: [], signatureType: 'all', threshold: 2 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document?')) return;
    try { await docAPI.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">My Documents</h1>
          <p className="text-sm text-slate-400 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} · SHA-256 hashed</p>
        </div>
        <Btn variant="primary" onClick={() => setShowForm(!showForm)}>
          <Upload size={15} /> Upload Document
        </Btn>
      </div>

      {/* Upload form */}
      {showForm && (
        <Card className="border-blue-700/40 animate-fadeIn">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Upload size={16} className="text-blue-400" /> Upload New Document
            </h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${drag ? 'border-blue-500 bg-blue-900/20' : file ? 'border-emerald-500 bg-emerald-900/10' : 'border-slate-600 hover:border-slate-500 bg-slate-900'}`}
              onClick={() => document.getElementById('pdf-input').click()}
            >
              <input id="pdf-input" type="file" accept=".pdf" className="hidden" onChange={onDrop} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-red-900/40 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-200 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
                  </div>
                  <CheckCircle size={20} className="text-emerald-400 ml-2" />
                </div>
              ) : (
                <>
                  <Upload size={32} className="text-slate-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">Drop PDF here or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">Maximum 20MB · PDF only</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Document Title" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Service Agreement Q3" required />
              <Input label="Description (optional)" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief document description" />
            </div>

            {/* Signers */}
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-2">
                Select Signers ({form.signerIds.length} selected)
              </label>
              {users.length === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-900 rounded-lg p-3 border border-slate-700">
                  No other users registered yet. Register other accounts to add signers.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {users.map(u => (
                    <button key={u._id} type="button" onClick={() => toggleSigner(u._id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all
                        ${form.signerIds.includes(u._id)
                          ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'}`}>
                      <Avatar name={u.name} size={7} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.name}</p>
                        <p className="text-xs opacity-60 truncate">{u.email}</p>
                      </div>
                      {form.signerIds.includes(u._id) && <CheckCircle size={14} className="text-blue-400 flex-shrink-0" />}
                      {u.biometricEnabled && (
                        <span className="text-xs bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded">Bio</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Signature config */}
            {form.signerIds.length > 1 && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
                  <Settings2 size={13} /> Signature Policy
                </p>
                <div className="flex gap-3">
                  {[
                    { v: 'all', label: 'All must sign', desc: 'Every signer required' },
                    { v: 'threshold', label: 'Threshold', desc: 'N of M required' },
                  ].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => setForm(p => ({ ...p, signatureType: opt.v }))}
                      className={`flex-1 p-3 rounded-lg border text-left transition-all
                        ${form.signatureType === opt.v ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 hover:border-slate-600'}`}>
                      <p className={`text-xs font-medium ${form.signatureType === opt.v ? 'text-blue-300' : 'text-slate-300'}`}>{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                {form.signatureType === 'threshold' && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 whitespace-nowrap">Minimum signatures:</label>
                    <input type="number" min={1} max={form.signerIds.length}
                      value={form.threshold}
                      onChange={e => setForm(p => ({ ...p, threshold: parseInt(e.target.value) }))}
                      className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-xs text-slate-500">of {form.signerIds.length} signers</span>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>{progress < 40 ? 'Uploading...' : progress < 70 ? 'Computing SHA-256...' : progress < 90 ? 'Adding to blockchain...' : 'Generating QR code...'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Btn type="submit" variant="primary" loading={uploading} className="flex-1">
                <Upload size={15} /> Upload & Hash Document
              </Btn>
              <Btn type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <Empty icon={FileText} title="No documents yet"
          description="Upload your first PDF to get started with blockchain-secured signing."
          action={<Btn variant="primary" onClick={() => setShowForm(true)}><Upload size={15} />Upload Document</Btn>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <button key={doc._id} onClick={() => navigate(`/doc/${doc._id}`)}
              className="w-full bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl p-4 text-left transition-all group flex items-center gap-4">
              <div className="w-11 h-11 bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-red-900/50 transition-all">
                <FileText size={20} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-slate-200 group-hover:text-white truncate">{doc.title}</p>
                  <StatusBadge status={doc.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><Users size={11} />{doc.signedCount}/{doc.totalSigners} signed</span>
                  <span className="flex items-center gap-1"><Hash size={11} />SHA-256</span>
                  <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                  {doc.fileSize && <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={e => deleteDoc(doc._id, e)}
                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={15} />
                </button>
                <Eye size={16} className="text-slate-600 group-hover:text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
