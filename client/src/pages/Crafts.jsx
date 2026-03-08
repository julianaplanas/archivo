import React, { useState, useEffect, useCallback } from 'react';
import CraftCard from '../components/crafts/CraftCard';
import CreateCraftModal from '../components/crafts/CreateCraftModal';
import api from '../lib/api';
import './Crafts.css';

const FILTERS = [
  { key: 'all',       label: 'all' },
  { key: 'wishlist',  label: '★ wishlist' },
  { key: 'completed', label: '✓ done' },
];

export default function Crafts() {
  const [filter, setFilter] = useState('all');
  const [crafts, setCrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const loadCrafts = useCallback(async () => {
    setLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    const { data } = await api.get(`/crafts${params}`);
    setCrafts(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadCrafts(); }, [loadCrafts]);

  async function handleComplete(craft) {
    await api.put(`/crafts/${craft.id}`, { status: 'completed' });
    setCrafts(cs => cs.map(c => c.id === craft.id ? { ...c, status: 'completed' } : c));
  }

  async function handleUncomplete(craft) {
    await api.put(`/crafts/${craft.id}`, { status: 'wishlist' });
    setCrafts(cs => cs.map(c => c.id === craft.id ? { ...c, status: 'wishlist' } : c));
  }

  async function handleDelete(id) {
    await api.delete(`/crafts/${id}`);
    setCrafts(cs => cs.filter(c => c.id !== id));
  }

  return (
    <div className="page">
      <div className="crafts-header">
        <h1 className="crafts-title">crafts</h1>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowCreate(true)}>
          + add
        </button>
      </div>

      <div className="crafts-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`craft-filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="page-content">
        {loading ? (
          <div className="crafts-loading">loading...</div>
        ) : crafts.length === 0 ? (
          <div className="crafts-empty">
            <div className="crafts-empty-art">{'[ nothing here yet ]'}</div>
            <div className="crafts-empty-sub">
              {filter === 'completed' ? 'complete a craft to see it here' : 'add a craft you want to make'}
            </div>
            {filter !== 'completed' && (
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
                onUncomplete={handleUncomplete}
                onEdit={c => setEditTarget(c)}
                onDelete={handleDelete}
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCraftModal
          onSave={loadCrafts}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editTarget && (
        <CreateCraftModal
          existing={editTarget}
          onSave={() => { loadCrafts(); setEditTarget(null); }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
