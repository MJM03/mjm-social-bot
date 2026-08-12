export default async function TikTokResult({ searchParams }) {
  const params = await searchParams;
  const ok = params?.status === 'success';
  const message = params?.message;

  return (
    <main className={ok ? 'success' : 'error'}>
      <span className="eyebrow">MJM Social Bot</span>
      <h1>{ok ? 'TikTok conectado correctamente' : 'No pudimos completar la conexión'}</h1>
      <p>
        {ok
          ? 'La autorización OAuth funcionó. En el siguiente paso añadiremos almacenamiento seguro del token y los permisos de publicación.'
          : `Detalle: ${message || 'error desconocido'}`}
      </p>
      <a className="primary" href="/">Volver al panel</a>
    </main>
  );
}
