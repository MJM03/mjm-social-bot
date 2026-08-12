'use client';

import { useEffect, useMemo, useState } from 'react';

const emptyDraft = {
  title: '',
  caption: '',
  platform: 'TikTok',
  date: '',
  time: '',
  status: 'Programada'
};

export default function ContentPlanner() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mjm_content_plan');
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('mjm_content_plan', JSON.stringify(items));
  }, [items, loaded]);

  const sorted = useMemo(() => [...items].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [items]);

  function updateField(event) {
    setDraft({ ...draft, [event.target.name]: event.target.value });
  }

  function addItem(event) {
    event.preventDefault();
    if (!draft.title || !draft.date || !draft.time) return;
    setItems(prev => [...prev, { ...draft, id: crypto.randomUUID(), createdAt: Date.now() }]);
    setDraft(emptyDraft);
  }

  function removeItem(id) {
    setItems(prev => prev.filter(item => item.id !== id));
  }

  function changeStatus(id, status) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  }

  return (
    <section className="planner" id="calendar">
      <div className="plannerHead">
        <div>
          <span className="eyebrow">Calendario de contenido</span>
          <h2>Planifica tus próximas publicaciones</h2>
          <p>Esta primera versión guarda tu calendario en este dispositivo mientras construimos la programación automática.</p>
        </div>
        <span className="plannerCount">{items.length} publicaciones</span>
      </div>

      <form className="plannerForm" onSubmit={addItem}>
        <input name="title" value={draft.title} onChange={updateField} placeholder="Nombre de la publicación" required />
        <select name="platform" value={draft.platform} onChange={updateField}>
          <option>TikTok</option>
          <option disabled>Facebook · próximamente</option>
        </select>
        <input name="date" type="date" value={draft.date} onChange={updateField} required />
        <input name="time" type="time" value={draft.time} onChange={updateField} required />
        <textarea name="caption" value={draft.caption} onChange={updateField} placeholder="Caption, idea o hashtags" rows="3" />
        <button className="primary" type="submit">Añadir al calendario</button>
      </form>

      <div className="plannerList">
        {sorted.length === 0 ? (
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
                  <option>Lista</option>
                  <option>Enviada</option>
                  <option>Error</option>
                </select>
              </div>
              {item.caption ? <p>{item.caption}</p> : null}
              <button className="textButton" type="button" onClick={() => removeItem(item.id)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
