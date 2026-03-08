import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CraftCard from '../components/crafts/CraftCard';
import CraftDetailModal from '../components/crafts/CraftDetailModal';
import CreateCraftModal from '../components/crafts/CreateCraftModal';
import api from '../lib/api';
import './Crafts.css';

const STATUS_FILTERS = [
  { key: 'all',       label: 'all' },
  { key: 'wishlist',  label: '★ wishlist' },
  { key: 'completed', label: '✓ done' },
  { key: 'shopping',  label: '🛒 to buy' },
];

export default function Crafts() {
  const [filter, setFilter] = useState('all');
  const [crafts, setCrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);

  const loadCrafts = useCallback(async () => {
    setLoading(true);
    const statusParam = filter !== 'all' && filter !== 'shopping' ? `?status=${filter}` : '';
    const { data } = await api.get(`/crafts${statusParam}`);
    setCrafts(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (filter === 'shopping') {
      setShoppingLoading(true);
      api.get('/crafts/materials/shopping-list')
        .then(r => setShoppingList(r.data))
        .finally(() => setShoppingLoading(false));
    } else {
      loadCrafts();
      setSearchText('');
      setActiveTagFilters([]);
    }
  }, [filter, loadCrafts]);

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

  async function markPurchased(itemId, purchased) {
    await api.patch(`/crafts/materials/${itemId}/purchased`, { purchased });
    setShoppingList(sl => sl.map(i => i.id === itemId ? { ...i, purchased: purchased ? 1 : 0 } : i));
  }

  // All unique tags across loaded crafts
  const allTags = useMemo(() => {
    const set = new Set();
    crafts.forEach(c => c.tags?.forEach(t => set.add(t)));
    return [...set].sort();
  }, [crafts]);

  function toggleTagFilter(tag) {
    setActiveTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  // Client-side filter
  const filteredCrafts = useMemo(() => {
    let list = crafts;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q));
    }
    if (activeTagFilters.length) {
      list = list.filter(c => activeTagFilters.some(t => c.tags?.includes(t)));
    }
    return list;
  }, [crafts, searchText, activeTagFilters]);

  function openDetail(craft) { setDetailTarget(craft); }
  function openEdit(craft) { setDetailTarget(null); setEditTarget(craft); }

  return (
    <div className="page">
      <div className="crafts-header">
        <h1 className="crafts-title">crafts</h1>
        <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setShowCreate(true)}>
          + add
        </button>
      </div>

      <div className="crafts-filters">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            className={`craft-filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter !== 'shopping' && (
        <div className="crafts-search-bar">
          <input
            type="search"
            placeholder="search crafts..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="crafts-search-input"
          />
        </div>
      )}

      {filter !== 'shopping' && allTags.length > 0 && (
        <div className="crafts-tag-filter">
          {allTags.map(tag => (
            <button
              key={tag}
              className={`craft-tag-filter-chip ${activeTagFilters.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="page-content">
        {filter === 'shopping' ? (
          shoppingLoading ? (
            <div className="crafts-loading">loading...</div>
          ) : shoppingList.filter(i => !i.purchased).length === 0 ? (
            <div className="crafts-empty">
              <div className="crafts-empty-art">[ nothing to buy ]</div>
              <div className="crafts-empty-sub">mark materials as "need to buy" on your crafts to see them here</div>
            </div>
          ) : (
            <div className="shopping-list">
              {shoppingList.filter(i => !i.purchased).map(item => (
                <div key={item.id} className="shopping-item">
                  <button className="shopping-check" onClick={() => markPurchased(item.id, true)}>
                    ○
                  </button>
                  <div className="shopping-info">
                    <span className="shopping-name">{item.name}</span>
                    {(item.quantity || item.unit) && (
                      <span className="shopping-qty">{item.quantity} {item.unit}</span>
                    )}
                    <span className="shopping-craft">{item.craft_title}</span>
                  </div>
                </div>
              ))}
              {shoppingList.some(i => i.purchased) && (
                <div className="shopping-purchased-section">
                  <div className="shopping-purchased-label">purchased</div>
                  {shoppingList.filter(i => i.purchased).map(item => (
                    <div key={item.id} className="shopping-item purchased">
                      <button className="shopping-check" onClick={() => markPurchased(item.id, false)}>
                        ✓
                      </button>
                      <div className="shopping-info">
                        <span className="shopping-name">{item.name}</span>
                        <span className="shopping-craft">{item.craft_title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : loading ? (
          <div className="crafts-loading">loading...</div>
        ) : filteredCrafts.length === 0 ? (
          <div className="crafts-empty">
            <div className="crafts-empty-art">{'[ nothing here yet ]'}</div>
            <div className="crafts-empty-sub">
              {searchText || activeTagFilters.length
                ? 'no crafts match your search'
                : filter === 'completed' ? 'complete a craft to see it here' : 'add a craft you want to make'}
            </div>
            {!searchText && !activeTagFilters.length && filter !== 'completed' && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                add first craft →
              </button>
            )}
          </div>
        ) : (
          <div className="crafts-list">
            {filteredCrafts.map((craft, i) => (
              <CraftCard
                key={craft.id}
                craft={craft}
                onOpen={openDetail}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onEdit={openEdit}
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

      {detailTarget && (
        <CraftDetailModal
          craft={detailTarget}
          onEdit={openEdit}
          onClose={() => setDetailTarget(null)}
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
