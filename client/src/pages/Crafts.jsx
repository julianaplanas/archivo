import React, { useState, useEffect, useCallback } from 'react';
import CraftCard from '../components/crafts/CraftCard';
import CreateCraftModal from '../components/crafts/CreateCraftModal';
import api from '../lib/api';
import './Crafts.css';

const TABS = [
  { key: 'wishlist',   label: '★ wishlist' },
  { key: 'completed',  label: '✓ completed' },
];

const EMPTY = {
  wishlist:  { art: '[ wishlist empty ]', sub: 'add a craft you want to make' },
  completed: { art: '[ nothing yet ]',    sub: 'complete a wishlist item to see it here' },
};

export default function Crafts() {
  const [tab, setTab] = useState('wishlist');
  const [crafts, setCrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const loadCrafts = useCallback(async (status = tab) => {
    setLoading(true);
    const { data } = await api.get(`/crafts?status=${status}`);
    setCrafts(data);
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadCrafts(tab); }, [tab]);

  async function handleComplete(craft) {
    await api.put(`/crafts/${craft.id}`, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    setCrafts(cs => cs.filter(c => c.id !== craft.id));
  }

  async function handleDelete(id) {
    await api.delete(`/crafts/${id}`);
    setCrafts(cs => cs.filter(c => c.id !== id));
  }

  function handleEdit(craft) {
    setEditTarget(craft);
  }

  return (
    <div className="page">
      <div className="crafts-header">
        <h1 className="crafts-title">crafts</h1>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowCreate(true)}>
          + add
        </button>
      </div>

      {/* Tab bar */}
      <div className="crafts-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`craft-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-content">
        {loading ? (
          <div className="crafts-loading">loading...</div>
        ) : crafts.length === 0 ? (
          <div className="crafts-empty">
            <div className="crafts-empty-art">{EMPTY[tab].art}</div>
            <div className="crafts-empty-sub">{EMPTY[tab].sub}</div>
            {tab === 'wishlist' && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                add first craft →
              </button>
            )}
          </div>
        ) : (
          <div className="crafts-list">
            {crafts.map((craft, i) => (
              <CraftCard
                key={craft.id}
                craft={craft}
                onComplete={handleComplete}
                onEdit={handleEdit}
                onDelete={handleDelete}
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCraftModal
          onSave={() => loadCrafts(tab)}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editTarget && (
        <CreateCraftModal
          existing={editTarget}
          onSave={() => { loadCrafts(tab); setEditTarget(null); }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
