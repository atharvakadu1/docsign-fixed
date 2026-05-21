// src/components/layout/Layout.js
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FileText, PenLine, Shield, Cpu,
  LogOut, Menu, X, Fingerprint, ChevronRight, Bell, User2
} from 'lucide-react';
import { Avatar } from '../ui';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-docs',    icon: FileText,         label: 'My Documents' },
  { to: '/pending',    icon: PenLine,          label: 'Sign Requests' },
  { to: '/blockchain', icon: Cpu,              label: 'Blockchain' },
  { to: '/biometric',  icon: Fingerprint,      label: 'Biometric Setup' },
  { to: '/security',   icon: Shield,           label: 'Security' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 fixed inset-y-0 z-30">
        <SidebarContent user={user} navItems={navItems} onLogout={handleLogout} />
      </aside>

      {/* Sidebar — mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-slate-900 flex flex-col z-50">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-white p-1" onClick={() => setMobileOpen(false)}>
              <X size={20} />
            </button>
            <SidebarContent user={user} navItems={navItems} onLogout={handleLogout} onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20">
          <button className="lg:hidden text-slate-400 hover:text-white p-1" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <button className="text-slate-400 hover:text-white p-1 relative">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <Avatar name={user?.name || '?'} size={7} />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ user, navItems, onLogout, onNav }) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm tracking-tight">DocSign</p>
          <p className="text-xs text-slate-500 font-mono">v2.0 · Secure</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} onClick={onNav}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
               ${isActive
                 ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                 : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-blue-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <Avatar name={user?.name || '?'} size={8} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );
}
