# Handoff de desarrollo: LR Coaching — plataforma de entrenamiento y nutrición
**Fuente:** `plataforma-coaching.html` (archivo único, ~3.800 líneas) · **Fecha:** 2026-06-19 · **Estándar a11y:** WCAG 2.1 AA

> Este documento describe la implementación **real** (no un diseño en Figma). El propio HTML/CSS/JS es la fuente de verdad. Sirve para (a) mantener/extender el código actual y (b) portarlo a un framework de componentes. Los valores son los del CSS vigente; donde digo "token" me refiero a la variable CSS correspondiente.

---

## 1. Overview

Aplicación de una sola página (SPA) sin framework: HTML + CSS + JavaScript vanilla en un único archivo. Plataforma de coaching online con **dos roles**:

- **Coach**: gestiona atletas, diseña rutinas y planes de nutrición, asigna volumen semanal por grupo muscular, revisa progreso y chatea.
- **Atleta**: ve su rutina del día ("Hoy"), registra series/cargas, marca comidas, reporta adherencia y chatea con el coach.

**Stack actual:** Vanilla JS, sin dependencias, sin build. Fuentes Sora (display) + Inter (body). **Persistencia:** `localStorage` (no hay backend). **Idioma:** español, cadenas embebidas en el código.

**Arquitectura de render:** un objeto `route={view,params}` + función `render()` que reconstruye `#app.innerHTML` según rol y vista. La interacción usa **delegación de eventos** sobre `document` con un mapa `ACTIONS[data-act]`. Un `MutationObserver` re-aplica accesibilidad tras cada render (ver §8).

Contenedores estáticos en `<body>`: `#app`, `#modal-root`, `#toast-root`.

---

## 2. Design tokens

### Color (definidos en `:root`)
| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#0b0d11` | Fondo de la app |
| `--bg2` | `#11141a` | Fondo de inputs, sidebar, rellenos sutiles, barras |
| `--card` | `#151921` | Fondo de tarjetas |
| `--card2` | `#1a202b` | Cabeceras elevadas, **estados activos** (nav/tab) |
| `--line` | `#232a36` | Bordes decorativos / divisores (bajo contraste, intencional) |
| `--line2` | `#2f3845` | Bordes y divisores más marcados |
| `--bd-input` | `#60707f` | **Bordes de controles** (input, `.btn-g`) — ≥3:1 (1.4.11) |
| `--tx` | `#e9edf4` | Texto primario (≈15:1) |
| `--tx2` | `#9aa5b6` | Texto secundario (≈7:1) |
| `--tx3` | `#8a96a8` | Texto terciario / hints (≥4.5:1) |
| `--volt` | `#cdf563` | **Reservado: acción primaria + indicador "Hoy"** (ver §11) |
| `--on-volt` | `#161f07` | Texto sobre relleno volt |
| `--blue` `--orange` `--red` `--green` `--purple` | `#7cd0fb` `#ffb45c` `#ff7066` `#52d98a` `#b69cff` | Estado/semántica (info, aviso, error, éxito, categoría) |

### Forma / elevación / motion
| Token | Valor | Uso |
|-------|-------|-----|
| `--r` | `14px` | Radio de tarjetas, modales grandes |
| `--r-s` | `10px` | Radio de inputs, botones, chips cuadrados |
| `--shadow` | `0 10px 30px rgba(0,0,0,.35)` | Modales, toasts, login card |
| `--font-d` | `'Sora', system-ui` | Encabezados y números destacados (700–800) |
| `--font-b` | `'Inter', system-ui` | Cuerpo, etiquetas, datos |

> **Radios fuera de token (deuda):** el código usa además 18/16/12/11/9/8/7/6 px en varios sitios. Recomendado consolidar a una escala corta (6 / 10 / 14 / 999).

### Escala tipográfica (vigente)
| Rol | Tamaño / peso / familia | Clase |
|-----|--------------------------|-------|
| Título de página | 21px / 700 / Sora | `.topbar h1` |
| Encabezado de sección | 20px / 700 / Sora | `.sect-h h2` |
| Título de tarjeta | 16.5px / 700 / Sora | `.card h3` |
| Subtítulo de bloque | 14.5px / 700 / Sora | `.dayblk-h h4` |
| Cuerpo | 14.5px / 400 / Inter, `line-height:1.5` | `body` |
| Etiqueta de campo | 12px / 600 / Inter, MAYÚS, `letter-spacing:.05em` | `label` |
| Cifra de stat | 24px / 700 / Sora | `.stat .v` |
| Calorías grandes | 34px / 800 / Sora | `.kcal-big` |
| Valor de matriz | 18px / 800 / Sora | `.mtx .vv` |

**Regla de legibilidad:** ningún texto informativo por debajo de **11px** (piso aplicado en todo el sistema).

### Espaciado y z-index
- Tarjeta: `padding:20px`; `.card + .card { margin-top:16px }`; rejillas `gap:16px`.
- Contenido: `padding:26px 28px 90px`; `max-width:1180px`; centrado.
- Topbar: `padding:18px 28px`; sticky; fondo `rgba(11,13,17,.85)` + `backdrop-filter:blur(8px)`.
- Capas: topbar `z-40` · sidebar móvil `z-60` · overlay modal `z-100` · toast `z-200`.

---

## 3. Layout y responsive

Rejilla raíz `.shell`: `grid-template-columns: 236px 1fr` (sidebar fija + contenido). Sidebar `sticky`, `height:100vh`.

| Breakpoint | Cambios |
|------------|---------|
| **Escritorio (>920px)** | Layout por defecto: sidebar izquierda 236px, rejillas `g2/g3/g4` a 2/3/4 columnas, formularios `frow2/frow3` en columnas. |
| **≤920px** | Sidebar → **barra inferior fija** (iconos + etiquetas), `border-top`. `g2/g3/g4`→2 col. `frow2/frow3`→1 col. Padding de contenido y topbar reducidos. |
| **≤560px** | `g3/g4`→2 col, `g2`→1 col, `.week` gap 4px, `frow4`→2 col. |
| **`@media(pointer:coarse)`** | Targets táctiles ampliados (registro de series, `.btn-ic`, `.btn-sm`, `.nav-item min-height:54px`, etc.) sin afectar densidad en escritorio. |

---

## 4. Biblioteca de componentes

Variantes = clases modificadoras; "props" = atributos `data-*`. Estados notables incluidos.

| Componente | Variantes / clases | Estados | Notas |
|-----------|--------------------|---------|-------|
| Botón | `.btn` + `.btn-p` (primario volt), `.btn-g` (gris/borde), `.btn-d` (peligro rojo), `.btn-sm`, `.btn-ic` (solo icono) | `:hover` (brillo/borde), `:active` (`translateY(1px)`), `[disabled]` (opacity .45), `:focus-visible` (contorno volt 2px) | `.btn-ic` requiere `aria-label` (lo aplica el pase a11y vía `title`/mapa). |
| Tarjeta | `.card` (+ `.card h3` con `.hint` a la derecha) | — | Borde `--line`; fondo `--card`. |
| Stat | `.stat` (`.k` etiqueta, `.v` cifra, `.sub`); tendencia `.up`/`.down`/`.flat` | — | Cifra ya en blanco (`--tx`). |
| Tarjeta de atleta | `.ath-card` (`.ath-head`, `.ath-meta`) | `:hover` borde volt; `cursor:pointer` | Navega al detalle del atleta. |
| Badge / pill | `.badge` + `.volt`/`.blue`/`.orange`/`.red`/`.green` | — | Patrón: fill 10% / borde 35% / texto color. `.badge.volt` ahora **neutro** (ver §11). |
| Chip | `.chip` + `.pri` (primario), `.cat`, `.green`/`.orange`/`.volt`, `.dim` | — | `.chip.pri` ahora blanco (primario) vs gris (secundario). |
| Tabs / segmentos | `.tabs > .tab(.on)`; `.seg > button(.on)` | `.on` = activo | Activo ahora `card2`/`line2` + texto blanco, sin volt. |
| Tabla | `.tblwrap` (scroll-x) + `table.tbl` (`th`, `td`, `.num` tabular) | — | `min-width:560px`; cabecera `--bg2`. |
| Bloque de día | `.dayblk` (`.dayblk-h` cabecera card2) | — | Contiene tabla de ejercicios. |
| Comida | `.meal` (`.meal-h`, `ul/li` con `.q`) | — | Divisores `dashed`. |
| Registro de serie | `.wlog-ex` → `.setrow` (grid 54/1fr/1fr/1fr/36px: serie, kg, reps, RIR, borrar), `.sethead`, `.addset` | `.exdone(.on)` verde; `.wlog-ex.done` | Inputs centrados, `tabular-nums`. **Solo placeholder, sin label** (gap a11y, §8). |
| Macros | `.macro-row` + `.mbar > i`; `.kcal-big`; `.mg-h` | — | Barras de progreso de macros. |
| Tira semanal | `.week > .wday(.today)` con `.d/.n/.dots` | `.today` = borde volt | `.today` es **el** indicador volt permitido. |
| Adherencia | `.adh-pick > button(.on)` | `.on` seleccionado (neutro) | Escala de iconos. |
| Modal | `.overlay > .modal` (`.modal-h/-b/-f`); `role="dialog" aria-modal aria-labelledby="modalTitle"` | abre/cierra | Ver §6 ciclo de vida. |
| Toast | `#toast-root > .toast` (icono check + texto) | auto-dismiss | Una sola variante (éxito/info). Ver §6 y §10. |
| Estado vacío | `.empty` con `<b>título</b> + descripción` | — | Usado ampliamente (≥12 lugares). |
| Login | `.login` (glows `::before/::after`), `.login-card`, `.userbtn` | `:hover` borde volt | Selección de usuario por rol. |
| Biblioteca | `.lib-grid` (auto-fill minmax 250px) + `.lib-card`; `.filterbar`; `.muschips/.chip` | `:hover` borde volt | Búsqueda + filtros. |
| Matriz de volumen | `.mtx` (`td.cell .vv/.uu/.rr`, `.t-maxima/.t-secundaria/.t-terciaria`) | color por tier | `.vv` por defecto ahora blanco; rojo/azul codifican máx/secundario. |
| Chat | `.chatwrap/.chatscroll`; `.bub.me`/`.bub.them`; `.chatbar`; `.chatrow` | no leído `.navbadge/.cdot` | Burbujas propias en volt (pendiente de decisión). |

---

## 5. Estados e interacciones

### Contrato de eventos (clave para portar)
Delegación global sobre `document`:

- **click** → `ACTIONS[el.closest('[data-act]').dataset.act](el)`. Parámetros por `data-*`: `data-aid` (atleta), `data-view`/`data-params` (navegación), `data-day`, `data-ex`, `data-meal`, `data-idx`, `data-pid`, `data-lib`, etc.
- **input / change** → handlers `data-change` (recálculo en vivo, p. ej. volumen) y bindings `data-bind` (registro de series).
- **keydown** → `Enter` en `#chat_input` envía mensaje; `Escape` cierra el modal (módulo a11y).
- `nav(view, params)` → fija `route`, llama `render()` y `window.scrollTo(0,0)`.

| Elemento | Estado | Comportamiento |
|----------|--------|----------------|
| `.btn-p` | hover / active | `filter:brightness(1.07)` / `translateY(1px)` |
| Botón/control | focus por teclado | `:focus-visible` contorno `2px var(--volt)` + offset 2px |
| Input/select/textarea | focus | borde → `--volt` (`outline:none` global anulado por focus-visible) |
| `.nav-item`/`.tab`/`.seg button` | `.on` (activo) | Fondo `card2`/`line2` + texto blanco (sin volt) |
| `.ath-card`/`.lib-card`/`.chatrow`/`.userbtn` | hover | borde → `--volt` (feedback transitorio, permitido) |
| Formulario | validación fallida | Guard inline → `toast('mensaje')` + `return`. **No** hay error por campo. |
| Acción destructiva | confirmar | `confirmModal(titulo,msg,act,args)` → modal con "Cancelar"/"Sí, continuar" |

### Ciclo de vida del modal
`openModal(title, bodyHTML, footHTML)` inyecta overlay + diálogo y **enfoca el primer campo** (`setTimeout 60ms`). Cierre por: botón ✕ (`data-act="modal-close"`), clic en overlay (`data-act="modal-overlay"`), o **Escape**. `closeModal()` vacía `#modal-root`.
**Pendiente:** no atrapa el Tab dentro del diálogo ni restaura el foco al disparador al cerrar (ver §8).

---

## 6. Motion / animación

| Elemento | Disparo | Animación | Duración | Easing |
|----------|---------|-----------|----------|--------|
| `.btn` | hover/active | filtro + `translateY` | 150ms / 50ms | ease (def.) |
| input/select | focus | color de borde | 150ms | ease |
| `.nav-item` | hover/active | background + color | 150ms | ease |
| tarjetas hover | hover | color de borde | 150ms | ease |
| `.overlay` | abrir modal | `@keyframes fade` (opacity) | 150ms | ease |
| `.modal` | abrir | `@keyframes pop` (scale .96→1 + translateY 6→0) | 180ms | ease |
| `.toast` | aparecer | `pop` | 200ms | ease |
| `.toast` | salir | fade opacity | 300ms a los **2200ms**, remove a **2600ms** | ease |
| `.adh-pick button` | seleccionar | `all` | 120ms | ease |

> **Recomendación:** no se especifica `easing` en ninguna transición (usa `ease` por defecto). Estandarizar (p. ej. `cubic-bezier(.2,.7,.3,1)`) daría una sensación más coherente.

---

## 7. Edge cases

- **Estados vacíos**: cubiertos con `.empty` (`<b>título</b> + guía de acción`) en chat, gráficas (mín. 2 registros), listado de atletas, comentarios, cobertura de categorías, sesiones, menú y comidas. Mantener este patrón al añadir vistas.
- **Texto largo / truncado**: `text-overflow:ellipsis` solo en 3 sitios (nombre en sidebar `.side-user .who b`, preview de chat `.cmsg`, nombre de músculo `.musrow .mn`). El resto del texto **envuelve**; verificar con cadenas largas (nombres de ejercicios, objetivos).
- **Persistencia frágil**: `loadState`/`saveState` envuelven `localStorage` en `try/catch` que **silencia errores**. Si el almacenamiento está lleno o bloqueado (modo privado), los datos se pierden sin avisar. Recomendado: avisar al usuario y/o exportar respaldo (ya existe `data-act="export"` → JSON).
- **Sin estados de carga**: al ser `localStorage` síncrono no hay spinners/skeletons. Si se añade backend, introducir estados de carga y de error de red por vista.
- **i18n**: español embebido en plantillas. Para multi-idioma, extraer cadenas a un diccionario.
- **Datos numéricos**: usan `font-variant-numeric:tabular-nums`; mantener al formatear nuevas cifras.

---

## 8. Accesibilidad

**Implementado:**
- `<html lang="es">`, `:focus-visible` global (contorno volt), bordes de control ≥3:1, texto terciario ≥4.5:1.
- Modal con `role="dialog" aria-modal="true" aria-labelledby="modalTitle"`; cierre con Escape; foco al primer campo al abrir.
- **Pase a11y en runtime** (`MutationObserver` sobre `#app/#modal-root/#toast-root`, debounced con `requestAnimationFrame`): tras cada render (1) asocia `<label>` con su control (`for`/`id`, genera id si falta), (2) nombra botones de solo icono (`aria-label` desde `title` o mapa `A11Y_ACT`), (3) marca SVG decorativos `aria-hidden="true"`.
- Targets táctiles ampliados en `@media(pointer:coarse)`.

**Cerrados (2026-06-19):**
1. ✅ **Toasts anunciados**: `#toast-root` ahora es `aria-live="assertive"`, así que los mensajes (incluida la validación) se anuncian. *Aún recomendado a futuro:* error por campo con `aria-invalid` + `aria-describedby` además del toast.
2. ✅ **Inputs de registro de series** (`.setrow`): el pase a11y (`a11yPlaceholders`) asigna `aria-label` desde el `placeholder` a cualquier input sin etiqueta — cubre "kg/reps/RIR" y cualquier campo solo-placeholder futuro.
3. ✅ **Foco del modal**: `openModal` guarda el disparador y enfoca el primer control; el handler de `keydown` atrapa Tab/Shift+Tab dentro del diálogo; `closeModal` restaura el foco al disparador. (Verificado con jsdom.)

**Gap restante (recomendado):**
4. **Orden de foco**: lógico (DOM); verificar manualmente en la barra inferior móvil con lector de pantalla real.

---

## 9. Decisiones de diseño recientes (mantener la intención)

- **Acento volt enfocado**: `--volt` se reserva para **acción primaria** (`.btn-p`) y el **indicador "Hoy"** (`.wday.today`); además hover/focus transitorios y codificación semántica de datos (prioridad 1, tier de volumen, valor cambiado, leyenda). Los **estados activos** (nav, tabs, segmentos, badges, chips primarios, valores de matriz) usan `card2`/blanco. No reintroducir volt como "esto está activo" ni como decoración.
- **Escala tipográfica** ampliada (21/20/16.5) para que secciones y títulos superen al cuerpo (14.5).
- **Piso de 11px** para texto legible.
- **Targets táctiles** ampliados solo en dispositivos táctiles.
- *Pendiente de decisión del producto:* burbujas de chat propias (`.bub.me`) y barras de datos de volumen siguen en volt.

---

## 10. Notas de portabilidad (a React/Tailwind u otro)

- **Tokens**: ya son CSS custom properties → mapear directo al `theme` de Tailwind o a un design-tokens file. Conservar nombres semánticos.
- **Componentes**: cada bloque `clase + data-act` se convierte en un componente con `props` que reflejan las variantes (`Button variant="p|g|d" size="sm|ic"`, `Badge tone=...`, `Tab active`, etc.).
- **Render + eventos**: sustituir `innerHTML` + delegación por render declarativo y handlers por componente; el mapa `ACTIONS` se reparte en handlers/acciones del store.
- **Estado**: el objeto `S` en `localStorage` (con migraciones `ensure*`) pasa a un store (Context/Zustand/Redux) o backend; las `ensure*` se vuelven migraciones de esquema.
- **A11y**: al construir componentes que ya emiten `for`/`aria-label`/`aria-hidden`, el `MutationObserver` deja de ser necesario.
- **Gráficas**: son SVG dibujado a mano inline; pueden mantenerse o cambiarse por una librería (recharts, visx).

---

## 11. Resumen de prioridades para el desarrollador

1. ✅ **Gaps de a11y cerrados** (§8): toasts `aria-live`, `aria-label` por placeholder en registro de series, y focus-trap + retorno de foco del modal. Pendiente opcional: errores por campo con `aria-invalid`.
2. **Robustez de persistencia** (§7): avisar si `localStorage` falla; promover respaldo/exportación.
3. **Consolidar radios** y **estandarizar easing** (deuda de sistema).
4. Si se añade backend: introducir **estados de carga/error** por vista (hoy inexistentes).
