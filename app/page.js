const cards = [
  ['TikTok', 'Pendiente de conectar', 'Conectaremos Login Kit + Content Posting API.'],
  ['Facebook', 'Pendiente', 'Lo conectaremos después de cerrar TikTok.'],
  ['Calendario', 'Próximamente', 'Programación segura de publicaciones.'],
  ['Métricas', 'Próximamente', 'Vistas, interacción y rendimiento por publicación.']
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <span className="badge">MJM Social Bot · V1</span>
          <h1>Tu centro de control para contenido y redes.</h1>
          <p>Conecta tus cuentas, prepara publicaciones, programa contenido y revisa qué está funcionando.</p>
          <div className="actions">
            <a className="primary" href="/api/auth/tiktok">Conectar TikTok</a>
            <a className="secondary" href="#status">Ver estado</a>
          </div>
        </div>
        <div className="panel">
          <span className="eyebrow">Estado del sistema</span>
          <strong>Configuración inicial</strong>
          <p>El frontend está listo. Falta añadir las credenciales privadas en Vercel y registrar el Redirect URI en TikTok.</p>
        </div>
      </section>

      <section id="status" className="grid">
        {cards.map(([title, status, description]) => (
          <article className="card" key={title}>
            <div className="cardTop"><h2>{title}</h2><span>{status}</span></div>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="roadmap">
        <span className="eyebrow">Flujo objetivo</span>
        <h2>Idea → contenido → aprobación → publicación → métricas</h2>
        <p>La V1 prioriza autorización oficial y publicación segura antes de añadir automatizaciones avanzadas.</p>
      </section>
    </main>
  );
}
