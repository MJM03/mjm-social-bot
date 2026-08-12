import { cookies } from 'next/headers';
import { decryptSession, tiktokCookie } from './lib/tiktokSession';
import TikTokUpload from './TikTokUpload';
import ContentPlanner from './ContentPlanner';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const session = decryptSession(cookieStore.get(tiktokCookie.name)?.value);
  const connected = Boolean(session?.access_token);
  const profile = session?.profile || null;
  const grantedScopes = session?.scope || '';

  const cards = [
    ['Facebook', 'Pendiente', 'Lo conectaremos después de cerrar TikTok.'],
    ['Métricas', 'Próximamente', 'Vistas, interacción y rendimiento por publicación.']
  ];

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <span className="badge">MJM Social Bot · Sandbox</span>
          <h1>Tu centro de control para contenido y redes.</h1>
          <p>Conecta tus cuentas, prepara publicaciones, programa contenido y revisa qué está funcionando.</p>
          <div className="actions">
            <a className="primary" href="/api/auth/tiktok">{connected ? 'Reconectar TikTok' : 'Conectar TikTok'}</a>
            <a className="secondary" href="#calendar">Abrir calendario</a>
          </div>
        </div>
        <div className="panel">
          <span className="eyebrow">Estado del sistema</span>
          <strong>{connected ? 'TikTok conectado' : 'Configuración inicial'}</strong>
          <p>{connected ? 'OAuth activo y sesión segura disponible para probar Content Posting API.' : 'Completa la autorización de TikTok para habilitar la prueba de publicación.'}</p>
        </div>
      </section>

      <section id="status" className="grid">
        <article className="card tiktokCard">
          <div className="cardTop"><h2>TikTok</h2><span>{connected ? 'Conectado ✓' : 'Pendiente de conectar'}</span></div>
          {connected ? (
            <>
              <div className="profileRow">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar de TikTok" /> : null}
                <div>
                  <strong>{profile?.display_name || 'Cuenta TikTok conectada'}</strong>
                  <p>Scopes: {grantedScopes || 'user.info.basic'}</p>
                </div>
              </div>
              <TikTokUpload />
            </>
          ) : (
            <p>Conectaremos Login Kit + Content Posting API.</p>
          )}
        </article>

        {cards.map(([title, status, description]) => (
          <article className="card" key={title}>
            <div className="cardTop"><h2>{title}</h2><span>{status}</span></div>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <ContentPlanner />

      <section className="roadmap">
        <span className="eyebrow">Siguiente fase</span>
        <h2>Calendario → cola automática → Facebook → métricas</h2>
        <p>El calendario ya permite organizar publicaciones. El siguiente salto será guardar archivos en la nube y ejecutar la cola programada desde servidor.</p>
      </section>
    </main>
  );
}
