'use client';

import { useState } from 'react';

const labels = {
  PROCESSING_UPLOAD: 'TikTok está procesando el archivo…',
  PROCESSING_DOWNLOAD: 'TikTok está descargando el archivo…',
  SEND_TO_USER_INBOX: 'TikTok confirmó que envió la notificación a tu bandeja de entrada.',
  PUBLISH_COMPLETE: 'Proceso completado en TikTok.',
  FAILED: 'TikTok marcó la carga como fallida.'
};

export default function TikTokUpload() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);

  async function checkStatus(publishId, attempts = 10) {
    for (let i = 0; i < attempts; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, i === 0 ? 1500 : 2500));
      const response = await fetch('/api/tiktok/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_id: publishId })
      });
      const data = await response.json();
      if (!data.ok) {
        setStatus(data);
        return;
      }
      setStatus(data);
      if (['SEND_TO_USER_INBOX', 'PUBLISH_COMPLETE', 'FAILED'].includes(data.status)) return;
    }
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setStatus(null);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/tiktok/upload', { method: 'POST', body: form });
      const data = await response.json();
      setResult(data);
      if (data.ok && data.publish_id) await checkStatus(data.publish_id);
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
        {loading ? 'Subiendo y verificando…' : 'Enviar a TikTok'}
      </button>
      {result && (
        <div className={result.ok ? 'uploadResult success' : 'uploadResult error'}>
          {result.ok ? 'Archivo transferido a TikTok. Verificando estado real…' : result.error}
          {result.publish_id ? <small> ID: {result.publish_id}</small> : null}
        </div>
      )}
      {status && (
        <div className={status.ok && status.status !== 'FAILED' ? 'uploadResult success' : 'uploadResult error'}>
          {status.ok ? (labels[status.status] || `Estado TikTok: ${status.status}`) : status.error}
          {status.fail_reason ? <small> Motivo: {status.fail_reason}</small> : null}
          {status.uploaded_bytes !== null && status.uploaded_bytes !== undefined ? <small> Bytes recibidos: {status.uploaded_bytes}</small> : null}
        </div>
      )}
    </form>
  );
}
