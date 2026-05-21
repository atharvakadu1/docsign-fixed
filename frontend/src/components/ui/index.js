// src/components/ui/index.js
import React from 'react';
import { Loader2 } from 'lucide-react';

// ── Button ────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:  'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus:ring-blue-500',
    secondary:'bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-slate-400',
    success:  'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    danger:   'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost:    'hover:bg-slate-700 text-slate-300 hover:text-white focus:ring-slate-400',
    outline:  'border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white hover:bg-slate-700 focus:ring-slate-400',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl ${padding ? 'p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:    'bg-slate-700 text-slate-300',
    blue:    'bg-blue-900/50 text-blue-300 border border-blue-700/50',
    green:   'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50',
    amber:   'bg-amber-900/50 text-amber-300 border border-amber-700/50',
    red:     'bg-red-900/50 text-red-300 border border-red-700/50',
    purple:  'bg-purple-900/50 text-purple-300 border border-purple-700/50',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

// ── Input ─────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>}
      <input
        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ label, options = [], className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>}
      <select className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 20, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-blue-400 ${className}`} />;
}

// ── HashDisplay ───────────────────────────────────────────
export function HashDisplay({ hash, label, short = false }) {
  const display = short && hash ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : hash;
  return (
    <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
      {label && <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>}
      <p className="font-mono text-xs text-emerald-400 break-all leading-relaxed">{display || '—'}</p>
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    draft:            { label: 'Draft',           color: 'gray'   },
    pending:          { label: 'Pending',          color: 'amber'  },
    viewed:           { label: 'Viewed',           color: 'blue'   },
    partially_signed: { label: 'Partially Signed', color: 'purple' },
    completed:        { label: 'Completed',        color: 'green'  },
    signed:           { label: 'Signed',           color: 'green'  },
    rejected:         { label: 'Rejected',         color: 'red'    },
    expired:          { label: 'Expired',          color: 'gray'   },
  };
  const { label, color } = map[status] || { label: status, color: 'gray' };
  return <Badge color={color}>{label}</Badge>;
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ name = '?', size = 8 }) {
  const colors = ['bg-blue-600','bg-purple-600','bg-emerald-600','bg-amber-600','bg-pink-600','bg-indigo-600'];
  const idx = name.charCodeAt(0) % colors.length;
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full ${colors[idx]} flex items-center justify-center text-white font-semibold flex-shrink-0`}
         style={{ width: size * 4, height: size * 4, fontSize: size * 1.4 }}>
      {initials}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────
export function Empty({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && <Icon size={48} className="text-slate-600 mb-4" />}
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-700" />
      {label && <span className="text-xs text-slate-500">{label}</span>}
      <div className="flex-1 h-px bg-slate-700" />
    </div>
  );
}
