# LR Coaching — notas para Claude

Plataforma de entrenamiento y nutrición (coach + atletas). Datos en Supabase.

⚠ **Este archivo es la ÚNICA excepción a la regla de `*.md` del `.gitignore`.** Esa regla
existe porque el repo es público y Pages sirve el repo entero: `Bitacora.md` llegó a estar
descargable con los emails de los atletas dentro. Aquí van solo mecánicas de git, despliegue
y arquitectura. **Nunca escribas aquí datos de atletas, emails, claves ni URLs privadas.**
La documentación interna sigue viviendo fuera del repo, en `C:\dev\lr-coaching-docs\`.

## Estructura

Es una app de un solo archivo: `index.html` (~800 KB) lleva el HTML, el CSS y **todo** el JS
en un único `<script>` inline. No hay build, ni `package.json`, ni bundler. Se edita el
archivo y ya. `sw.js` es el service worker de la PWA; `recetario-base.json` son los datos de
recetas.

Comprobar la sintaxis del JS después de editar (no hay linter ni tests):

```bash
python3 -c "
import io,re
s=io.open('index.html',encoding='utf-8').read()
io.open('/tmp/app.js','w',encoding='utf-8').write(max(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>',s,re.S),key=len))
" && node --check /tmp/app.js
```

`grep` trata `index.html` como binario; usa `grep -a`.

## Despliegue — LEE ESTO ANTES DE DECIR QUÉ ESTÁ PUBLICADO

GitHub Pages publica **`main`** desde la raíz (hay `.nojekyll`, no hay workflow de Actions).
Push a `main` = publicar. El trabajo se desarrolla en ramas `claude/*` y se lleva a `main`
con fast-forward cuando el usuario lo autoriza — publicar es decisión suya, no tuya.

⚠ **El `main` local de una sesión remota puede venir desatrasado respecto a `origin/main`.**
Pasó el 2026-09-17: el clon traía `main` en un commit viejo, y por leerlo sin actualizar se
reportó que 22 commits ya publicados seguían sin publicar. Antes de afirmar nada sobre qué
está en producción:

```bash
git fetch origin --prune
git log --oneline origin/main..<rama>     # contra origin/main, NUNCA contra main local
```

Y ojo: `git log` compara por SHA. Si algo se mergeó con squash, el contenido puede estar
publicado bajo otro SHA y aparecer igual como "pendiente". Confirma por contenido:

```bash
git show origin/main:index.html | grep -ac "<nombre de una función nueva>"
```

Desde este entorno **no se puede abrir el sitio en vivo**: el proxy de salida rechaza
`mightywicho.github.io` con 403 en el CONNECT. Verifica contra `origin/main`, no contra el
servidor, y dilo así de claro cuando reportes.

Publicar no es verlo al instante: el service worker sirve el HTML de su caché y revalida por
detrás, así que la versión nueva entra en la **siguiente** apertura de la app (o cuando salte
el aviso de `checkAppVersion`). `.pages-kick` existe para forzar un redespliegue cuando Pages
se atasca: se le añade una línea y se sube.

## Convenios

- Código, comentarios, commits y UI **en español, con acentos**.
- Los comentarios del repo explican el *porqué* de cada decisión, a menudo en varios
  párrafos, y citan las sesiones donde se tomó (`s42`, `s61`, `s62`). Sigue ese tono: al
  cambiar una decisión, actualiza el comentario que la justificaba.
- Una "semana" tiene dos definiciones vivas y deliberadas: la de **calendario** (lunes a
  domingo, `weekStartISO`) para el contador del atleta y los promedios, y la del **bloque**
  (7 días desde `routine.startDate`) para Progreso, «Semana a semana» y el Historial.
  Antes de introducir una tercera, revisa cuál de las dos ya sirve.
- ⚠ `blockInfoForDate` y `weekOfDate` mienten cuando el dato no es ideal: si
  `routine.startDate` está vacío toman como inicio la fecha que se les consulta, y su
  `Math.max(1,…)` aplasta contra la semana 1 todo lo anterior al inicio declarado. Con un
  bloque cuya fecha se puso tarde, una vista que agrupe por ellas mete el historial entero
  en «Semana 1». El Historial dejó de usarlas por eso: ancla cada bloque en la más temprana
  entre su inicio declarado y su primera sesión (`blockGroupsOf`). Si añades otra vista por
  semanas, decide qué haces con esos dos casos antes de apoyarte en ellas.
- ⚠ **Dos bloques pueden llevar el mismo número.** Cerrar un bloque lo archiva en
  `routine.history` con el `profile.block` de ese momento, pero no incrementa `profile.block`
  solo: lo elige el coach en el diálogo, y dejarlo como estaba deja un bloque 1 archivado
  conviviendo con un bloque 1 en curso (pasa hoy con dos atletas reales). Nunca uses el número
  de bloque como clave de agrupado ni de id; usa la posición en `history` (o `'cur'`). Y el
  `endDate` del archivado puede ser el mismo día que el `startDate` del nuevo: en ese día manda
  el bloque archivado, que es el que estaba corriendo cuando se registró la sesión.
- El panel del coach va **siempre en kg**, aunque el atleta capture en libras.
