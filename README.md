# MJM Social Bot

Panel web para conectar TikTok, subir borradores y programar contenido.

## Cola cloud

La app puede guardar el calendario y los videos en Firebase/Google Cloud y procesar publicaciones programadas desde GitHub Actions cada 5 minutos.

### Variables en Vercel

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app
CRON_SECRET=
```

Mantén también configuradas las variables de TikTok existentes.

### Firebase

1. Crea un proyecto Firebase y una base Cloud Firestore.
2. Activa Cloud Storage.
3. Crea una cuenta de servicio con acceso a Firestore y Storage.
4. Copia Project ID, client email y private key a las variables privadas de Vercel.
5. Usa el nombre exacto del bucket en `FIREBASE_STORAGE_BUCKET`.

### Scheduler

El workflow `.github/workflows/content-queue.yml` llama `/api/queue/run` cada 5 minutos.

Crea un secreto de Actions llamado `CRON_SECRET` en GitHub y usa exactamente el mismo valor en la variable `CRON_SECRET` de Vercel.

Después vuelve a conectar TikTok una vez para que la conexión cifrada quede disponible para la cola cloud.
