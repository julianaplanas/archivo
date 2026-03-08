import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal';
import api from '../../lib/api';
import './CreateCraftModal.css';

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');

  function addTag(raw) {
    const tag = raw.trim().toLowerCase();
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
    if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1));
  }

  return (
    <div className="tag-input-wrap">
      {tags.map(t => (
        <span key={t} className="tag-chip">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}>✕</button>
        </span>
      ))}
      <input
        type="text"
        placeholder={tags.length ? '' : 'add tags…'}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input && addTag(input)}
        style={{ border: 'none', background: 'none', outline: 'none', flex: 1, minWidth: 80, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 16 }}
      />
    </div>
  );
}

function ImagePreview({ existing, newFiles, onRemoveExisting, onRemoveNew }) {
  const allPreviews = [
    ...existing.map(img => ({ type: 'existing', img })),
    ...newFiles.map((f, i) => ({ type: 'new', file: f, url: URL.createObjectURL(f), i })),
  ];
  if (!allPreviews.length) return null;
  return (
    <div className="img-preview-row">
      {allPreviews.map((item, idx) => (
        <div key={idx} className="img-preview-thumb">
          <img
            src={item.type === 'existing' ? `/uploads/${item.img.filepath}` : item.url}
            alt=""
          />
          <button
            type="button"
            className="img-remove-btn"
            onClick={() => item.type === 'existing' ? onRemoveExisting(item.img.id) : onRemoveNew(item.i)}
          >✕</button>
        </div>
      ))}
    </div>
  );
}

function UrlList({ urls, fetchingIdx, onFetch, onAdd, onRemove, onChange }) {
  return (
    <div className="url-list">
      {urls.map((url, i) => (
        <div key={i} className="url-row">
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={e => onChange(i, e.target.value)}
          />
          <button type="button" className="btn btn-ghost fetch-btn" onClick={() => onFetch(i)} disabled={fetchingIdx === i}>
            {fetchingIdx === i ? '…' : '↓'}
          </button>
          {urls.length > 1 && (
            <button type="button" className="url-remove-btn" onClick={() => onRemove(i)}>✕</button>
          )}
        </div>
      ))}
      <button type="button" className="notif-time-add" onClick={onAdd}>+ add url</button>
    </div>
  );
}

function MaterialsList({ materials, onChange }) {
  function update(i, key, val) {
    const next = materials.map((m, mi) => mi === i ? { ...m, [key]: val } : m);
    onChange(next);
  }
  function remove(i) { onChange(materials.filter((_, mi) => mi !== i)); }
  function add() { onChange([...materials, { name: '', quantity: '', unit: '', status: 'need' }]); }

  return (
    <div className="mat-list">
      {materials.map((m, i) => (
        <div key={i} className="mat-row">
          <input
            type="text"
            placeholder="material name"
            value={m.name}
            onChange={e => update(i, 'name', e.target.value)}
            className="mat-name"
          />
          <input
            type="number"
            placeholder="qty"
            value={m.quantity}
            onChange={e => update(i, 'quantity', e.target.value)}
            className="mat-qty"
            min="0"
            step="any"
          />
          <input
            type="text"
            placeholder="unit"
            value={m.unit}
            onChange={e => update(i, 'unit', e.target.value)}
            className="mat-unit"
          />
          <button
            type="button"
            className={`mat-status-btn ${m.status === 'have' ? 'have' : 'need'}`}
            onClick={() => update(i, 'status', m.status === 'have' ? 'need' : 'have')}
          >
            {m.status === 'have' ? '✅ have' : '🛒 need'}
          </button>
          <button type="button" className="mat-remove-btn" onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="notif-time-add" onClick={add}>+ add material</button>
    </div>
  );
}

export default function CreateCraftModal({ onSave, onClose, existing = null }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [urls, setUrls] = useState(() => {
    if (existing?.source_urls?.length) return existing.source_urls;
    if (existing?.source_url) return [existing.source_url];
    return [''];
  });
  const [ogTitle, setOgTitle] = useState(existing?.og_title ?? '');
  const [ogImage, setOgImage] = useState(existing?.og_image ?? '');
  const [tags, setTags] = useState(existing?.tags ?? []);
  const [forPerson, setForPerson] = useState(existing?.for_person ?? '');
  const [deadlineDate, setDeadlineDate] = useState(existing?.deadline_date ?? '');
  const [deadlineLabel, setDeadlineLabel] = useState(existing?.deadline_label ?? '');
  const [materials, setMaterials] = useState(existing?.materials ?? []);
  const [existingImages, setExistingImages] = useState(existing?.images ?? []);
  const [newFiles, setNewFiles] = useState([]);
  const [fetchingIdx, setFetchingIdx] = useState(null);
  const [ogFetchError, setOgFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  async function fetchOG(idx) {
    const url = urls[idx];
    if (!url) return;
    setFetchingIdx(idx);
    setOgFetchError('');
    try {
      const { data } = await api.get(`/og?url=${encodeURIComponent(url)}`);
      if (data.title) { if (!title) setTitle(data.title); setOgTitle(data.title); }
      if (data.image) setOgImage(data.image);
    } catch {
      setOgFetchError("couldn't fetch that URL — you can still save it manually");
    }
    setFetchingIdx(null);
  }

  function updateUrl(i, val) {
    setUrls(u => u.map((x, xi) => xi === i ? val : x));
  }

  function addUrl() { setUrls(u => [...u, '']); }
  function removeUrl(i) { setUrls(u => u.filter((_, ui) => ui !== i)); }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(prev => [...prev, ...files]);
    fileRef.current.value = '';
  }

  async function handleRemoveExistingImage(imgId) {
    try { await api.delete(`/craft-images/${imgId}`); } catch { /* silent */ }
    setExistingImages(imgs => imgs.filter(i => i.id !== imgId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('title is required'); return; }
    setSaving(true); setError('');
    const cleanUrls = urls.filter(u => u.trim());
    const cleanMaterials = materials.filter(m => m.name.trim());
    try {
      if (existing) {
        await api.put(`/crafts/${existing.id}`, {
          title: title.trim(), description, source_urls: JSON.stringify(cleanUrls),
          og_title: ogTitle, og_image: ogImage, tags, for_person: forPerson || null,
          deadline_date: deadlineDate || null, deadline_label: deadlineLabel || null,
          materials: JSON.stringify(cleanMaterials),
        });
        if (newFiles.length) {
          const fd = new FormData();
          newFiles.forEach(f => fd.append('images', f));
          await api.post(`/crafts/${existing.id}/images`, fd);
        }
      } else {
        const fd = new FormData();
        fd.append('title', title.trim());
        if (description) fd.append('description', description);
        if (cleanUrls[0]) fd.append('source_url', cleanUrls[0]);
        fd.append('source_urls', JSON.stringify(cleanUrls));
        if (ogTitle)     fd.append('og_title', ogTitle);
        if (ogImage)     fd.append('og_image', ogImage);
        tags.forEach(t => fd.append('tags', t));
        if (forPerson) fd.append('for_person', forPerson);
        if (deadlineDate) fd.append('deadline_date', deadlineDate);
        if (deadlineLabel) fd.append('deadline_label', deadlineLabel);
        fd.append('materials', JSON.stringify(cleanMaterials));
        newFiles.forEach(f => fd.append('images', f));
        await api.post('/crafts', fd);
      }
      onSave();
      onClose();
    } catch { setError('something went wrong'); }
    finally { setSaving(false); }
  }

  const previewUrl = ogImage || (newFiles[0] ? URL.createObjectURL(newFiles[0]) : null);

  return (
    <Modal title={existing ? 'edit craft' : 'add to wishlist'} onClose={onClose} fullHeight>
      <form onSubmit={handleSubmit} className="craft-form">

        {/* OG preview banner */}
        {previewUrl && !existingImages.length && !newFiles.length && (
          <div className="og-preview">
            <img src={previewUrl} alt="" />
          </div>
        )}

        <div className="cf-field">
          <label>source urls</label>
          <UrlList
            urls={urls}
            fetchingIdx={fetchingIdx}
            onFetch={fetchOG}
            onAdd={addUrl}
            onRemove={removeUrl}
            onChange={updateUrl}
          />
          {ogFetchError && <div className="cf-fetch-error">{ogFetchError}</div>}
        </div>

        <div className="cf-field">
          <label>title</label>
          <input
            type="text"
            placeholder="what are you making?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus={!existing}
          />
        </div>

        <div className="cf-field">
          <label>description (optional)</label>
          <textarea
            placeholder="notes, difficulty, why you want to make this..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="cf-field">
          <label>for someone? (optional)</label>
          <input
            type="text"
            placeholder="e.g. mum, best friend..."
            value={forPerson}
            onChange={e => setForPerson(e.target.value)}
          />
        </div>

        <div className="cf-field">
          <label>deadline (optional)</label>
          <div className="deadline-row">
            <input
              type="date"
              value={deadlineDate}
              onChange={e => setDeadlineDate(e.target.value)}
              className="deadline-date"
            />
            <input
              type="text"
              placeholder="label, e.g. Ana's birthday"
              value={deadlineLabel}
              onChange={e => setDeadlineLabel(e.target.value)}
              className="deadline-label"
            />
          </div>
        </div>

        <div className="cf-field">
          <label>tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div className="cf-field">
          <label>materials needed (optional)</label>
          <MaterialsList materials={materials} onChange={setMaterials} />
        </div>

        <div className="cf-field">
          <label>photos</label>
          <ImagePreview
            existing={existingImages}
            newFiles={newFiles}
            onRemoveExisting={handleRemoveExistingImage}
            onRemoveNew={i => setNewFiles(f => f.filter((_, fi) => fi !== i))}
          />
          <button
            type="button"
            className="btn btn-ghost upload-btn"
            onClick={() => fileRef.current.click()}
          >
            + add photos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFiles}
          />
        </div>

        {error && <div className="cf-error">{error}</div>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }} disabled={saving}>
          {saving ? 'saving...' : existing ? 'save changes' : 'add to wishlist →'}
        </button>
      </form>
    </Modal>
  );
}
