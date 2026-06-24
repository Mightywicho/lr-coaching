# Despliegue — LR Coaching

## Archivos web (lo que se sube)
- `plataforma-coaching.html` → **renómbralo a `index.html`** en el hosting para que cargue en la raíz (`/`).
- `favicon.svg`, `site.webmanifest`
- `icon-180.png`, `icon-192.png`, `icon-512.png`, `og-image.png`

Todos deben quedar en la **misma carpeta raíz** (las rutas del `<head>` son relativas).

## Opciones de hosting (todas con HTTPS y dominio gratis)
1. **Netlify Drop** — lo más rápido: entra a app.netlify.com/drop y arrastra la carpeta. URL al instante; luego puedes conectar tu dominio.
2. **Cloudflare Pages / Vercel / GitHub Pages** — gratis, buen rendimiento, dominio propio.
3. **base44 site** — cuando hagamos el backend (bloque 4): `npm run build` (si se proyectiza) → `npx base44 site deploy -y`. Sirve la SPA junto con la base de datos y la auth, todo en el mismo dominio.

## Pendientes a propósito (los hago en el momento correcto)
- **Vista previa social (og:image):** algunos validadores exigen **URL absoluta**. Cuando tengas el dominio, cambio `og:image`/`twitter:image`/`apple-touch-icon` a `https://tudominio/og-image.png`.
- **Service worker (PWA offline / instalable):** lo dejé fuera **a propósito**. Si lo activo ahora, el navegador cachearía versiones viejas mientras seguimos desarrollando. Lo añado (`sw.js` + registro) justo antes del lanzamiento: ahí queda instalable en el móvil y funcionando offline.

## Recordatorio importante
Hasta completar el **bloque 4 (backend base44)**, la app sigue guardando en `localStorage`: **cada dispositivo tiene sus propios datos** y el login no tiene contraseña. Es decir, subirla ahora sirve como **demo en un dispositivo**, no todavía como producto multiusuario. El paso que lo convierte en producto real es el backend.
