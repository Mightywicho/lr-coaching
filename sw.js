/* ============================================================================
   Service Worker de LR Coaching — PWA de solo lectura offline
   ============================================================================
   Qué resuelve: que la app abra al instante (y que abra aunque no haya señal)
   en el celular del atleta, sin volver a bajar los ~700 KB del index cada vez.

   REGLA DE ORO — el HTML se sirve de cache Y se revalida por detrás.
   Antes iba por red primero, para no pisar el detector de versión de la app
   (checkAppVersion en index.html). El costo era que NADA corría hasta bajar los
   ~750 KB del index: con datos móviles malos, el atleta miraba una pantalla
   muerta con la app entera ya guardada en su teléfono.
   Ahora la copia guardada se devuelve al instante y la versión del servidor se
   baja en paralelo para la próxima apertura. El detector de versión NO se rompe:
   pregunta por HEAD, y un HEAD no es GET, así que este worker ni lo toca — sigue
   viendo el etag real del servidor y sigue avisando (bitácora s42).
   La pieza que cierra el círculo es REFRESCAR_HTML: antes de recargar, la app
   pide por mensaje que se traiga el HTML nuevo a la cache, así la recarga abre
   ya con la versión nueva en vez de repetir la vieja en bucle.

   Lo que SÍ se cachea agresivamente son las dependencias que no cambian:
   supabase-js, html2canvas y las fuentes. Sin ellas en cache la app no arranca
   offline: supabase-js entra por <script> bloqueante y, si no baja,
   supabase.createClient() truena antes de pintar nada.

   Lo que NUNCA se cachea: las llamadas a Supabase (datos). Se dejan pasar tal
   cual. Servir datos viejos desde aquí sería mentirle al atleta sobre su plan,
   y peor: el código de arriba podría subir esa copia vieja encima de la buena.
   El manejo de "sin datos" lo hace la app, que arranca de su copia en
   localStorage y se pone en modo solo lectura.
============================================================================ */
'use strict';

/* Sube este número cuando cambien PRECACHE o la estrategia. No hace falta
   tocarlo en cada deploy de index.html: el HTML no se versiona por aquí, se
   revalida solo en cada apertura (ver cacheLuegoRed). */
const SW_VERSION = 'v5';
const CACHE_SHELL = 'lrc-shell-' + SW_VERSION;  /* archivos propios */
const CACHE_DEPS  = 'lrc-deps-'  + SW_VERSION;  /* CDN y fuentes */
const VIGENTES = [CACHE_SHELL, CACHE_DEPS];

/* Relativos a propósito: el sitio puede vivir en la raíz o en un subdirectorio
   de GitHub Pages, y los absolutos ('/index.html') romperían el segundo caso. */
const PRECACHE = [
  './',
  './index.html',
  './site.webmanifest',
  './favicon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './recetario-base.json'
];

/* Dependencias externas que la app necesita para ARRANCAR, precacheadas a mano.
   No se pueden dejar al azar del primer uso: en la primera visita el worker todavía
   no controla la página, así que los <script> del <head> no pasan por él y no se
   guardarían hasta la SEGUNDA visita. Un atleta que instala la app y se va al gym
   sin señal no tiene segunda visita.
   Se piden en no-cors: la respuesta es opaca (ilegible desde JS, status 0) pero el
   navegador sí la ejecuta cuando este worker la devuelve, que es lo único que importa.
   supabase-js si falta, no arranca nada. La hoja de fuentes va aquí no por estética
   sino por velocidad: el <link> está ANTES de los <script> en el <head>, así que
   hasta que responde no corre una línea de la app. Con Google Fonts lento (datos
   móviles malos) el atleta se queda mirando una pantalla en blanco aunque todo lo
   demás ya esté en el dispositivo. Cacheada, responde al instante. Los .woff2 que
   esa hoja referencia viven en otro dominio y los recoge cachePrimero por su cuenta;
   si faltan, se cae a la tipografía del sistema y la app funciona igual.
   OJO: estas URLs deben ser IDÉNTICAS a las de index.html — la cache se busca por URL
   exacta. Si allá se sube de versión, hay que subirla aquí también. */
const DEPS_PRECACHE = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap'
];

/* Orígenes externos que la app necesita para arrancar. Cualquier otro se deja
   pasar sin tocar (Supabase incluido). */
const DEPS_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

/* ---------- instalación ---------- */

/* Descarga con plazo. Sin él, un solo servidor lento retrasa —o impide para siempre—
   la instalación entera, y mientras el worker no se active NO hay copia offline: el
   atleta con mala señal, que es justo quien la necesita, se queda sin ella en todas
   sus visitas. Lo que no baje aquí lo recoge cachePrimero en otra visita. */
const PLAZO_DESCARGA = 15000;
async function traer(url, opciones) {
  const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const t = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, PLAZO_DESCARGA) : null;
  try {
    return await fetch(url, Object.assign({}, opciones, ctrl ? { signal: ctrl.signal } : null));
  } finally {
    if (t) clearTimeout(t);
  }
}

/* addAll() es todo-o-nada: un 404 en un solo archivo dejaría la app sin cache
   entera y sin offline. Se guardan uno por uno para que lo que sí bajó sirva. */
self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE_SHELL);
    await Promise.all(PRECACHE.map(async url => {
      try {
        /* cache:'reload' salta la cache HTTP del navegador: al instalar
           queremos el archivo recién publicado, no el que traía el disco. */
        const res = await traer(url, { cache: 'reload' });
        if (res && res.ok) await cache.put(url, res);
      } catch (e) { /* sin red al instalar: se poblará al primer uso */ }
    }));
    const deps = await caches.open(CACHE_DEPS);
    await Promise.all(DEPS_PRECACHE.map(async url => {
      try {
        const res = await traer(url, { mode: 'no-cors', cache: 'reload' });
        /* opaca (status 0) es lo normal aquí y se guarda igual; un 404 real no. */
        if (res && (res.ok || res.type === 'opaque')) await deps.put(url, res);
      } catch (e) { /* sin red al instalar: cachePrimero lo recogerá en otra visita */ }
    }));
    /* Tomar el control sin esperar a que se cierren las pestañas viejas. El comentario que
       había aquí decía que el HTML iba por red y que por eso no había riesgo de servir uno
       viejo; dejó de ser cierto cuando la navegación pasó a cache-luego-red. Sí puede servir
       una versión atrás durante una apertura, y eso es deliberado: lo cubre el detector de
       versión de la app, que va por HEAD (no pasa por aquí) y pide REFRESCAR_HTML antes de
       recargar. Lo que skipWaiting evita es quedarse con DOS workers y dos estrategias. */
    self.skipWaiting();
  })());
});

/* ---------- activación ---------- */
self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.map(n => (VIGENTES.indexOf(n) === -1 ? caches.delete(n) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', ev => {
  if (ev.data === 'SKIP_WAITING') self.skipWaiting();
  /* La app detectó (por HEAD) que hay una versión nueva en el servidor y va a recargar.
     Como el HTML ahora se sirve de cache, recargar sin más volvería a abrir la copia
     vieja y el aviso saldría otra vez, y otra. Aquí se baja la versión nueva y se deja
     guardada ANTES de recargar; se contesta por el puerto para que la app sepa cuándo.
     Si algo falla se contesta igual: la app recarga de todas formas y, en el peor caso,
     entra en la siguiente apertura — nunca se queda esperando. */
  if (ev.data && ev.data.tipo === 'REFRESCAR_HTML') {
    ev.waitUntil((async () => {
      let ok = false;
      try {
        const res = await traer('./index.html', { cache: 'reload' });
        if (res && res.ok) {
          const cache = await caches.open(CACHE_SHELL);
          await cache.put('./index.html', res.clone());
          ok = true;
        }
      } catch (e) {}
      try { if (ev.ports && ev.ports[0]) ev.ports[0].postMessage({ ok: ok }); } catch (e) {}
    })());
  }
});

/* ---------- estrategias ---------- */

/* Red primero, cache de paracaídas. Para HTML y para el recetario. */
async function redPrimero(req, nombreCache, claveCache) {
  const cache = await caches.open(nombreCache);
  try {
    const res = await fetch(req);
    /* Solo se guardan respuestas buenas: cachear un 404 o un 500 de Pages
       dejaría al atleta con una pantalla en blanco guardada para siempre. */
    if (res && res.ok && res.type !== 'opaque') {
      cache.put(claveCache || req, res.clone()).catch(() => {});
    }
    return res;
  } catch (e) {
    const hit = await cache.match(claveCache || req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

/* Cache primero y se revalida por detrás, para el HTML de la app.
   Devuelve la copia guardada AL INSTANTE —sin esperar a la red— y en paralelo baja
   la versión del servidor para dejarla lista para la próxima apertura.
   El porqué: index.html pesa ~750 KB y con «red primero» el atleta no ejecutaba una
   sola línea hasta tenerlo entero. Con datos móviles malos eso son segundos mirando
   una pantalla muerta con la app YA en su teléfono.
   Lo que se pierde: la primera apertura después de un deploy puede ir una versión
   atrás. No queda a ciegas — el detector de versión de la app hace un HEAD contra el
   servidor (no pasa por aquí: no es GET) y avisa. Y cuando esa recarga llega, la app
   pide antes REFRESCAR_HTML, así que recarga ya con la versión nueva, no en bucle. */
/* Firma de una versión: el etag de Pages cambia solo si cambia el contenido. */
function firma(res) {
  return res ? (res.headers.get('etag') || res.headers.get('last-modified') || res.headers.get('content-length') || '') : '';
}
async function cacheLuegoRed(req, nombreCache, claveCache, ev) {
  const cache = await caches.open(nombreCache);
  const clave = claveCache || req;
  const hit = await cache.match(clave, { ignoreSearch: true });
  /* cache:'no-cache' = preguntar SIEMPRE al servidor (con el etag, un 304 si no cambió).
     Antes iba con la cache HTTP normal y Pages manda max-age=600: durante 10 min tras un
     deploy la «revalidación» devolvía la copia vieja del disco y la versión nueva no
     entraba ni a la segunda apertura. */
  const viaje = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => {
    /* Solo respuestas buenas: guardar un 404 o un 500 de Pages dejaría al atleta
       con una pantalla en blanco guardada para siempre. */
    if (res && res.ok && res.type !== 'opaque') {
      await cache.put(clave, res.clone()).catch(() => {});
      /* Se abrió con una copia y el servidor ya tiene otra: avisar a la app para que
         se recargue con la nueva (el detector por HEAD no lo ve, porque su primera
         lectura ya es la versión nueva y la toma como la propia). */
      const a = firma(hit), b = firma(res);
      if (hit && a && b && a !== b) {
        const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        cs.forEach(c => { try { c.postMessage({ tipo: 'VERSION_NUEVA' }); } catch (e) {} });
      }
    }
    return res;
  });
  if (hit) {
    viaje.catch(() => {});
    /* Que el navegador no mate al worker antes de terminar: en iOS cerrar la app a los
       pocos segundos cortaba la descarga y la versión nueva nunca quedaba guardada. */
    if (ev && ev.waitUntil) { try { ev.waitUntil(viaje.catch(() => {})); } catch (e) {} }
    return hit;
  }
  return viaje;   /* primera visita: no hay copia, toca esperar a la red */
}

/* Cache primero y se revalida por detrás. Para lo que no cambia: iconos,
   manifest, supabase-js, fuentes. Devuelve al instante y se actualiza sola
   para la próxima apertura. */
async function cachePrimero(req, nombreCache) {
  const cache = await caches.open(nombreCache);
  const hit = await cache.match(req, { ignoreSearch: false });
  if (hit) {
    /* sin await: no retrasa la respuesta */
    fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    }).catch(() => {});
    return hit;
  }
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', ev => {
  const req = ev.request;

  /* Solo GET. Los POST/PATCH/DELETE de Supabase y el HEAD del detector de
     versión pasan intactos — un SW no puede cachear nada de eso y meterse
     solo añadiría una capa donde algo puede fallar. */
  if (req.method !== 'GET') return;
  /* Con Range es el detector de versión de la app leyendo el <head> del servidor: tiene
     que ir a la red tal cual, nunca a la cache (ni guardarse: sería un HTML cortado). */
  if (req.headers.has('range')) return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const mismoOrigen = url.origin === self.location.origin;

  /* 1. Navegación (abrir la app, recargar, volver al icono instalado).
        Red primero; si no hay señal, el index guardado. Así abre offline. */
  if (req.mode === 'navigate') {
    ev.respondWith((async () => {
      try {
        return await cacheLuegoRed(req, CACHE_SHELL, './index.html', ev);
      } catch (e) {
        const cache = await caches.open(CACHE_SHELL);
        const hit = (await cache.match('./index.html')) || (await cache.match('./'));
        if (hit) return hit;
        return new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<title>Sin conexión</title>' +
          '<body style="background:#0b0d11;color:#e9edf4;font:15px/1.5 system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
          '<div style="text-align:center;max-width:320px;padding:24px">' +
          '<p>No hay conexión y todavía no se guardó una copia de la app en este dispositivo.</p>' +
          '<p style="color:#9aa5b6;font-size:13px">Ábrela una vez con internet y después funcionará sin señal.</p>' +
          '</div>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  if (mismoOrigen) {
    /* 2. El HTML pedido por fetch (no navegación): cache primero, igual que arriba. */
    if (/\/(index\.html)?$/.test(url.pathname) || url.pathname.endsWith('.html')) {
      ev.respondWith(cacheLuegoRed(req, CACHE_SHELL, './index.html', ev).catch(async () => {
        const c = await caches.open(CACHE_SHELL);
        return (await c.match('./index.html')) || Response.error();
      }));
      return;
    }
    /* 3. Recetario base: la app lo pide con ?v=Date.now() para saltarse la cache
          del navegador. Se guarda SIN el parámetro (clave fija) y se recupera con
          ignoreSearch, o cada apertura dejaría una copia huérfana más. */
    if (url.pathname.endsWith('recetario-base.json')) {
      ev.respondWith(redPrimero(req, CACHE_SHELL, './recetario-base.json').catch(async () => {
        const c = await caches.open(CACHE_SHELL);
        return (await c.match('./recetario-base.json')) || Response.error();
      }));
      return;
    }
    /* 4. Resto de lo propio (iconos, manifest, og-image): cache primero. */
    ev.respondWith(cachePrimero(req, CACHE_SHELL).catch(() => caches.match(req).then(r => r || Response.error())));
    return;
  }

  /* 5. Dependencias externas conocidas: cache primero. Sin esto no hay arranque
        offline. Todo lo demás —Supabase sobre todo— no se toca. */
  if (DEPS_HOSTS.indexOf(url.hostname) !== -1) {
    ev.respondWith(cachePrimero(req, CACHE_DEPS).catch(() => caches.match(req).then(r => r || Response.error())));
  }
});
