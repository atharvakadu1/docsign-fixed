// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

import AuthPage      from './pages/AuthPage';
import Dashboard     from './pages/Dashboard';
import MyDocs        from './pages/MyDocs';
import DocDetail     from './pages/DocDetail';
import Pending       from './pages/Pending';
import Blockchain    from './pages/Blockchain';
import BiometricSetup from './pages/BiometricSetup';
import Security      from './pages/Security';
import VerifyPage    from './pages/VerifyPage';
import { Spinner }   from './components/ui';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Spinner size={32} />
    </div>
  );
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Spinner size={32} />
    </div>
  );
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
            success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login"        element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/verify/:docId" element={<VerifyPage />} />

          {/* Protected */}
          <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/my-docs"    element={<PrivateRoute><MyDocs /></PrivateRoute>} />
          <Route path="/doc/:id"    element={<PrivateRoute><DocDetail /></PrivateRoute>} />
          <Route path="/pending"    element={<PrivateRoute><Pending /></PrivateRoute>} />
          <Route path="/blockchain" element={<PrivateRoute><Blockchain /></PrivateRoute>} />
          <Route path="/biometric"  element={<PrivateRoute><BiometricSetup /></PrivateRoute>} />
          <Route path="/security"   element={<PrivateRoute><Security /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
