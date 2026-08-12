'use client';

import { useEffect, useMemo, useState } from 'react';

const emptyDraft = {
  title: '',
  caption: '',
  platform: 'TikTok',
  date: '',
  time: ''
};

export default function ContentPlanner() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloud, setCloud] = useState(false);
  const [message, setMessage] = useState('');

  async function loadItems() {
    setLoading(true);
    try {
      const response = await fetch('/api/planner', { cache: 'no-store' });
      const data = await response.json();
      if (data.ok) {
        setItems(data.items || []);
        setCloud(Boolean(data.cloud));
        if (!data.cloud) setMessage('Activa Firebase en Vercel para guardar y programar en la nube.');
      } else {
        setMessage(data.error || 'No se pudo cargar el calendario.');
      }
    } catch {
      setMessage('No se pudo conectar con el calendario en la nube.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, []);

  const sorted = useMemo(() => [...items].sort((a, b) => String(a.scheduledAt || '').localeCompare(String(b.scheduledAt || ''))), [items]);

  function updateField(event) {
    setDraft({ ...draft, [event.target.name]: event.target.value });
  }

  async function addItem(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const form = new FormData();
      Object.entries(draft).forEach(([key, value]) => form.append(key, value));
      if (media) form.append('media', media);
      const response = await fetch('/api/planner', { method: 'POST', body: form });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'No se pudo programar.');
      setDraft(emptyDraft);
      setMedia(null);
      setCloud(true);
      setMessage('Publicación guardada en la nube y añadida a la cola.');
      await loadItems();
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id) {
    const response = await fetch(`/api/planner?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await response.json();
    if (data.ok) setItems(prev => prev.filter(item => item.id !== id));
    else setMessage(data.error || 'No se pudo eliminar.');
  }

  async function changeStatus(id, status) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    const response = await fetch('/api/planner', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    const data = await response.json();
    if (!data.ok) {
      setMessage(data.error || 'No se pudo actualizar el estado.');
      await loadItems();
    }
  }

  return (
    <section className="planner" id="calendar">
      <div className="plannerHead">
        <div>
          <span className="eyebrow">Calendario + cola</span>
          <h2>Programa contenido aunque cierres el iPhone</h2>
          <p>Las publicaciones se guardan en la nube. Cuando el worker esté activo, enviará automáticamente los videos que lleguen a su hora.</p>
        </div>
        <div className="plannerStatus">
          <span className={cloud ? 'cloudBadge online' : 'cloudBadge'}>{cloud ? 'Nube activa ✓' : 'Nube pendiente'}</span>
          <span className="plannerCount">{items.length} publicaciones</span>
        </div>
      </div>

      {message ? <div className="plannerNotice">{message}</div> : null}

      <form className="plannerForm" onSubmit={addItem}>
        <input name="title" value={draft.title} onChange={updateField} placeholder="Nombre de la publicación" required />
        <select name="platform" value={draft.platform} onChange={updateField}>
          <option>TikTok</option>
          <option disabled>Facebook · siguiente fase</option>
        </select>
        <input name="date" type="date" value={draft.date} onChange={updateField} required />
        <input name="time" type="time" value={draft.time} onChange={updateField} required />
        <textarea name="caption" value={draft.caption} onChange={updateField} placeholder="Caption, idea o hashtags" rows="3" />
        <label className="plannerFile">
          <span>Video para la publicación</span>
          <input name="media" type="file" accept="video/mp4,video/quicktime,video/webm" onChange={e => setMedia(e.target.files?.[0] || null)} />
          <small>{media ? `${media.name} · ${(media.size / 1024 / 1024).toFixed(2)} MB` : 'MP4/MOV/WebM · máximo 4 MB en esta V1'}</small>
        </label>
        <button className="primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar y programar'}</button>
      </form>

      <div className="plannerToolbar">
        <button className="secondary" type="button" onClick={loadItems} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar cola'}</button>
      </div>

      <div className="plannerList">
        {loading ? (
          <div className="plannerEmpty">Cargando calendario…</div>
        ) : sorted.length === 0 ? (
          <div className="plannerEmpty">Todavía no tienes publicaciones programadas.</div>
        ) : sorted.map(item => (
          <article className="plannerItem" key={item.id}>
            <div className="plannerDate">
              <strong>{item.date}</strong>
              <span>{item.time}</span>
            </div>
            <div className="plannerBody">
              <div className="plannerItemTop">
                <div>
                  <span className="platformPill">{item.platform}</span>
                  <h3>{item.title}</h3>
                </div>
                <select value={item.status} onChange={e => changeStatus(item.id, e.target.value)}>
                  <option>Programada</option>
                  <option>Pendiente</option>
                  <option>Procesando</option>
                  <option>Enviada</option>
                  <option>Error</option>
                </select>
              </div>
              {item.caption ? <p>{item.caption}</p> : null}
              {item.mediaName ? <small className="mediaMeta">🎬 {item.mediaName} · {(Number(item.mediaSize || 0) / 1024 / 1024).toFixed(2)} MB</small> : <small className="mediaMeta warning">Sin video adjunto</small>}
              {item.publishId ? <small className="mediaMeta">TikTok ID: {item.publishId}</small> : null}
              {item.error ? <small className="mediaMeta warning">Error: {item.error}</small> : null}
              <button className="textButton" type="button" onClick={() => removeItem(item.id)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
