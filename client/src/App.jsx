import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trackers from './pages/Trackers';
import TrackerDetail from './pages/TrackerDetail';
import Crafts from './pages/Crafts';
import Books from './pages/Books';
import Settings from './pages/Settings';
import TabBar from './components/TabBar';
import api from './lib/api';

export default function App() {
  const [authed, setAuthed] = useState(null); // null = loading

  useEffect(() => {
    const token = localStorage.getItem('archivo_token');
    if (!token) { setAuthed(false); return; }
    api.get('/auth/me')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          authed ? <Navigate to="/" replace /> : <Login onLogin={() => setAuthed(true)} />
        } />
        {authed ? (
          <>
            <Route path="/" element={<><Dashboard /><TabBar /></>} />
            <Route path="/trackers" element={<><Trackers /><TabBar /></>} />
            <Route path="/trackers/:id" element={<><TrackerDetail /><TabBar /></>} />
            <Route path="/crafts" element={<><Crafts /><TabBar /></>} />
            <Route path="/books" element={<><Books /><TabBar /></>} />
            <Route path="/settings" element={<><Settings /><TabBar /></>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
