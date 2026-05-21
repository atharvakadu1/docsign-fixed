// src/pages/Pending.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { docAPI } from '../services/api';
import { Card, Spinner, Empty, StatusBadge, Btn, Avatar } from '../components/ui';
import { PenLine, Clock, User, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function Pending() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    docAPI.pending()
      .then(r => setRequests(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-white">Sign Requests</h1>
        <p className="text-sm text-slate-400 mt-0.5">{requests.length} pending signature{requests.length !== 1 ? 's' : ''}</p>
      </div>

      {requests.length === 0 ? (
        <Empty icon={PenLine} title="No pending requests"
          description="You're all caught up! Signature requests will appear here when someone asks you to sign a document." />
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const doc = req.docId;
            if (!doc) return null;
            const isExpiring = req.expiresAt && new Date(req.expiresAt) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
            return (
              <div key={req._id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-500 transition-all">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-11 h-11 bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium text-slate-200">{doc.title}</h3>
                      <StatusBadge status={req.status} />
                      {isExpiring && (
                        <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={10} /> Expiring soon
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap mb-3">
                      <span className="flex items-center gap-1.5">
                        <Avatar name={doc.authorId?.name || '?'} size={4} />
                        Requested by {doc.authorId?.name}
                      </span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {formatDistanceToNow(new Date(req.createdAt))} ago</span>
                      {req.expiresAt && <span>Expires {format(new Date(req.expiresAt), 'MMM d')}</span>}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{doc.description}</p>
                    )}
                    <Btn variant="primary" size="sm" onClick={() => navigate(`/doc/${doc._id}`)}>
                      <PenLine size={13} /> Review & Sign
                    </Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
