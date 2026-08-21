# GILD Content Intelligence Dashboard

La pagina del dashboard vive en `src/pages/dashboard/index.astro`. Sus assets y datos viven en `public/dashboard/` y se publican junto con el build de Astro. En local queda disponible en:

```txt
http://localhost:4321/dashboard/
```

## Comandos

```powershell
pnpm dev
pnpm build
pnpm sync:social
pnpm sync:install
```

`pnpm sync:social` actualiza `public/dashboard/social-data.json` y `public/dashboard/social-snapshots.json`.

`pnpm sync:install` instala una tarea horaria de Windows llamada `GILD Social Metrics Sync`.

## Objetivo del registro

El dashboard esta pensado como un registro editorial automatico:

- una fila por publicacion o pieza de contenido;
- canal donde salio;
- fecha;
- metricas disponibles;
- score comparable;
- lectura accionable para decidir que reutilizar, pausar o empujar.

Si una fuente todavia no esta conectada, aparece una fila `profile_signal` como proxy. Eso sirve para ver que falta, pero no reemplaza las metricas reales por post.

## Indispensable para que se popule solo

Para cada canal necesitamos una credencial de lectura que permita listar publicaciones y leer performance. Sin eso solo podemos mostrar perfil publico o proxy.

| Fuente | Necesario | Que llena en el registro |
| --- | --- | --- |
| LinkedIn | `GILD_LINKEDIN_ORG_ID` + `LINKEDIN_ACCESS_TOKEN` | posts, fecha, reacciones, comentarios, reposts/clicks si el permiso lo habilita |
| Instagram | `GILD_INSTAGRAM_BUSINESS_ID` + `META_ACCESS_TOKEN` | posts/reels, fecha, likes, comentarios y luego insights como plays/saves/shares |
| Beehiiv | `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID` | newsletters, opens, clicks, sent, subscribers |
| Website / GA4 | `GA4_PROPERTY_ID` + service account | usuarios, sesiones, pageviews, eventos |
| Website / Cloudflare | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_WORKER_NAME` | requests, errors, subrequests del deploy `gildhq` |
| YouTube | `YOUTUBE_API_KEY` | videos, views y stats completas |
| Spotify | `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` | episodios y metadata publica/API |

## Datos conectados

El sync ya usa lo publico posible de:

- LinkedIn: `https://www.linkedin.com/company/joingild/?viewAsMember=true`
- Instagram: `https://www.instagram.com/gild.hq/`
- YouTube: `https://www.youtube.com/@GILDhq`
- Spotify: `https://creators.spotify.com/pod/show/0TSnQszN4VY8tyOgIYPsQy/episodes`
- Newsletter: Beehiiv cuando haya API key.
- Website: Google Analytics 4 cuando haya property ID + service account.

## Para analytics completos

Crear `.env` desde `.env.example` y completar los tokens/IDs reales:

- `GILD_LINKEDIN_ORG_ID`
- `LINKEDIN_ACCESS_TOKEN`
- `GILD_INSTAGRAM_BUSINESS_ID`
- `META_ACCESS_TOKEN`
- `GILD_YOUTUBE_CHANNEL_ID`
- `YOUTUBE_API_KEY`
- `GILD_SPOTIFY_SHOW_ID`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `BEEHIIV_API_KEY`
- `BEEHIIV_PUBLICATION_ID`
- `GA4_PROPERTY_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` o `GOOGLE_SERVICE_ACCOUNT_JSON`

## Beehiiv paso a paso

1. Entrar a Beehiiv con el usuario que administra la newsletter.
2. Ir a Settings / Integrations / API.
3. Crear una API key con permisos de lectura para publications y posts.
4. Copiar la key en `.env` como `BEEHIIV_API_KEY`.
5. Correr `pnpm sync:social`.
6. Si no sabes el publication ID, el sync toma la primera publication disponible. Despues de correr, mirar `public/dashboard/social-data.json` y copiar el `publicationId` detectado en `.env` como `BEEHIIV_PUBLICATION_ID`.

El sync usa la API v2 de Beehiiv con `Authorization: Bearer <token>`, lista publications y posts con `expand[]=stats`.

## Google Analytics paso a paso

1. Entrar a Google Analytics y abrir la propiedad GA4 de `gildhq.com`.
2. Ir a Admin / Property details y copiar el Property ID numerico en `.env` como `GA4_PROPERTY_ID`.
3. Entrar a Google Cloud Console.
4. Crear o elegir un proyecto.
5. Habilitar Google Analytics Data API.
6. Crear una Service Account.
7. Crear una JSON key para esa Service Account y guardarla fuera del repo, por ejemplo `D:\Downloads\GILD\ga4-service-account.json`.
8. En Google Analytics, ir a Admin / Property access management.
9. Agregar el email de la Service Account como Viewer.
10. En `.env`, poner `GOOGLE_APPLICATION_CREDENTIALS=D:\Downloads\GILD\ga4-service-account.json`.
11. Correr `pnpm sync:social`.

Para GitHub Actions o deploys sin archivo local, usar `GOOGLE_SERVICE_ACCOUNT_JSON` como secret con el contenido completo del JSON.

## Cloudflare website metrics

El dominio `gildhq.com` esta en el account `Tecla` y el Worker principal es `gildhq`.

Valores ya detectados:

```txt
CLOUDFLARE_ACCOUNT_ID=f0ca853c1ccd053b1260f761c3c48377
CLOUDFLARE_ZONE_ID=364f79210efdf730167d563b5d0fd2f2
CLOUDFLARE_WORKER_NAME=gildhq
```

Falta solo `CLOUDFLARE_API_TOKEN` para que el sync local pueda correr automaticamente sin depender de Codex.

Permisos minimos recomendados para el token:

- `Account Analytics:Read`
- `Workers Scripts:Read`
- `Zone Analytics:Read`
- `Zone:Read`

Scope:

- Account: `Tecla`
- Zone: `gildhq.com`
