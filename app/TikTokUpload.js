'use client';

import { useState } from 'react';

export default function TikTokUpload() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/tiktok/upload', { method: 'POST', body: form });
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'No se pudo completar la subida.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="uploadBox" onSubmit={submit}>
      <label htmlFor="video"><strong>Subir video a TikTok como borrador</strong></label>
      <p>Para esta prueba usa un MP4/MOV/WebM de menos de 4 MB.</p>
      <input id="video" name="video" type="file" accept="video/mp4,video/quicktime,video/webm" required />
      <button className="primary uploadButton" type="submit" disabled={loading}>
        {loading ? 'Enviando…' : 'Enviar a TikTok'}
      </button>
      {result && (
        <div className={result.ok ? 'uploadResult success' : 'uploadResult error'}>
          {result.ok ? result.message : result.error}
          {result.publish_id ? <small> ID: {result.publish_id}</small> : null}
        </div>
      )}
    </form>
  );
}
