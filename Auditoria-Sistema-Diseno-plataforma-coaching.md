# Auditoría del sistema de diseño: LR Coaching
**Fuente:** `plataforma-coaching.html` · **Fecha:** 2026-06-19 · **Método:** análisis estático del CSS y de los estilos inline en el render JS.

## Resumen
**Componentes revisados:** ~22 · **Issues:** 9 · **Puntuación:** **68 / 100**

Veredicto: tienes un **sistema visual maduro y rico en componentes**, con base de tokens semántica y 0 `!important` (especificidad limpia). La brecha no es estética sino de **sistematización**: los tokens existen pero se *esquivan* (estilos inline + hex repetidos), no hay escala tipográfica ni de espaciado, y hay proliferación de nombres para primitivos parecidos. Es muy buen prototipo de una sola persona; para escalar a equipo necesita enforcement de tokens.

### Puntuación por dimensión
| Dimensión | Puntos | Lectura |
|-----------|:------:|---------|
| Fundación de tokens (existen, semánticos) | 15/20 | Color, radio, sombra y fuentes sí; faltan tipografía, espaciado y motion |
| **Adherencia a tokens (se usan)** | **8/20** | 234 estilos inline + ~110 hex hardcodeados + 49 `rgba()` sin token |
| Consistencia de nombres | 12/20 | Base sólida (`tx/line/card`), pero sprawl de "píldoras" y abreviaturas crípticas |
| Completitud de componentes | 17/20 | Estados/variantes ricos y ya documentados (ver Handoff) |
| Higiene y accesibilidad | 16/20 | 0 `!important`, `:focus-visible`, a11y resuelta; quedan ~5 textos <11px |

---

## Cobertura de tokens
| Categoría | Definidos | Hardcodeados encontrados |
|-----------|-----------|--------------------------|
| **Color** | 18 de color en `:root` (+ radio/sombra/fuente) | **~110 hex inline** que duplican tokens: `#cdf563`/volt ×18, `#7cd0fb`/blue ×16, `#ffb45c`/orange ×11, `#52d98a`/green ×10, `#b69cff`/purple ×5, `#232a36`/line ×4, `#9aa5b6`/tx2 ×3… |
| **Color con alpha** | 0 | **49 `rgba()` literales** (el patrón teñido 10%/35% hecho a mano: volt .1/.12/.4, blue .1/.35…). Sin token. |
| **Tipografía** | 0 (solo 2 familias) | **22 tamaños px distintos**, sin escala. Casi-duplicados: 13/13.5, 12/12.5, 11/11.5, 14/14.5 |
| **Espaciado** | 0 | padding/margin en px crudos en todo el CSS + **234 `style="…"` inline** en el render JS |
| **Radio** | 2 (`--r` 14, `--r-s` 10) | **15 valores distintos** (999, 6, 8, 7, 5, 2, 12, 9, 16, 3, 18, 17, 14, 11, 10) |
| **Sombra** | 1 (`--shadow`) | Pocas adicionales; OK |
| **Motion** | 0 | ~6 duraciones (50/120/150/180/200/300ms) sin token |

> **Corrección (2026-06-23), tras inspeccionar el código:** el CSS (`<style>`) ya está **prácticamente 100% tokenizado** — solo quedaba `#0d1015` (ahora token `--ink`) y un `#8fd14f` decorativo en el degradado del logo. Los ~110 hex "hardcodeados" viven casi todos en el **código de gráficas**: 22 en atributos SVG `fill=/stroke=` y 52 en strings JS de paleta, donde `var()` **no es válido**. Por eso la recomendación de "pasar todo a `var()`" era incorrecta para este código; lo correcto es una **paleta JS derivada de los tokens** (ver Acción 1).
>
> ✅ **Regresión corregida:** las 7 `#657183` (etiquetas de texto en las gráficas SVG) pasaron a `#8a96a8` (= `--tx3`), recuperando contraste.

> **Piso de 11px no del todo aplicado:** aún hay ~5 textos a 10–10.5px (subtítulo de marca, hora del chat, cabecera de series). En el audit previo subí los informativos; estos decorativos quedaron. Conviene cerrarlos o aceptarlos explícitamente.

---

## Consistencia de nombres
| Problema | Componentes / clases | Recomendación |
|----------|----------------------|---------------|
| Sprawl de "píldoras" | `.chip`, `.badge`, `.mini-chip`, `.planchip`, `.kpill`, `.setpill` | Unificar en un primitivo `.pill` + modificadores (`--sm`, `--tint-volt`) |
| Abreviaturas crípticas | `.kpill.vm/.vme/.vma/.vmr`, `.vv/.uu/.rr`, `.sn/.mn/.mb/.mv` | Documentar un glosario o renombrar a algo legible |
| Mismo concepto, prefijo distinto | `.g2/.g3/.g4` vs `.frow2/.frow3/.frow4` | Unificar a un solo sistema de columnas (`.cols-2/-3/-4`) |
| Abreviaturas de botón | `.btn-p` / `-g` / `-d` / `-sm` / `-ic` | Documentar la leyenda (p=primary, g=ghost, d=danger) o pasar a `.btn--primary` |

**Lo que sí es consistente (mantener):** tokens base `--tx/--tx2/--tx3`, `--line/--line2`, `--bg/--bg2`, `--card/--card2` (convención "base + número"); el estado activo unificado bajo `.on`; el patrón de estado vacío `.empty`.

---

## Completitud de componentes
| Componente | Estados | Variantes | Docs | Score |
|-----------|:-------:|:---------:|:----:|:-----:|
| Botón (`.btn`) | ✅ hover/active/disabled/focus | ✅ p/g/d/sm/ic | ✅ | 9/10 |
| Input / formulario | ✅ focus/placeholder/error(toast) | ⚠️ sin tamaños | ✅ | 7/10 |
| Tarjeta (`.card`) | ⚠️ solo default | ⚠️ una | ✅ | 7/10 |
| Badge / Chip | ✅ | ✅ color/tint | ⚠️ nombres dispersos | 6/10 |
| Tabs / Segmentos | ✅ on | ✅ | ✅ | 8/10 |
| Tabla (`.tbl`) | ✅ | ⚠️ una | ✅ | 7/10 |
| Modal | ✅ abrir/cerrar/foco-trap | ✅ confirm | ✅ | 9/10 |
| Toast | ⚠️ una sola (sin error/warning) | ❌ | ✅ | 6/10 |
| Estado vacío (`.empty`) | ✅ | — | ✅ | 8/10 |
| Registro de series (`.setrow`) | ✅ done | ⚠️ | ✅ | 7/10 |

Observación: el **toast** es monovariante (siempre check + borde volt), pero se usa también para **errores de validación** → conviene una variante `danger`/`warning` (icono + color) además del `aria-live` ya añadido.

---

## Acciones prioritarias
1. **Paleta JS única para las gráficas (mayor impacto).** El CSS ya usa tokens; el problema está en el **código de gráficas**, donde `var()` no aplica (atributos SVG / strings JS). Solución correcta: definir una **paleta JS** (`const PAL`) leída de los tokens con `getComputedStyle` al arrancar, y que las funciones de gráfica usen `PAL.volt` en vez de repetir `'#cdf563'` (×18), `'#7cd0fb'` (×16), etc. Así los tokens CSS siguen siendo la única fuente de verdad también para las gráficas. *(Toca el render de gráficas — conviene hacerlo con verificación, no a ciegas.)* **Parte segura ya aplicada:** regresión `#657183` corregida y `#0d1015`→`--ink`.
2. **Escala tipográfica.** Definir ~7 tokens (`--text-xs 11 … --text-3xl 34`) y mapear los 22 tamaños actuales, colapsando los casi-duplicados (13/13.5, 12/12.5…). De paso, aplicar de verdad el piso de 11px (cerrar los ~5 restantes).
3. **Consolidar radios y unificar el primitivo "píldora".** Pasar de 15 radios a 4 tokens (`--r-xs 6 / --r-s 10 / --r 14 / --r-full 999`) y fundir chip/badge/mini-chip/planchip/kpill/setpill en un `.pill` con modificadores. Reduce ruido y facilita el mantenimiento.

> Pasos 1–3 son refactor de bajo riesgo (cambios mecánicos de CSS, sin tocar comportamiento). Recomendado en ese orden. La fundación ya es buena; esto la vuelve un sistema **enforceable**.

---

## Siguientes modos disponibles
- `document [componente]` — ficha completa (variantes, props, estados, a11y, código) de cualquier componente.
- `extend [patrón]` — diseñar uno nuevo: candidatos naturales son **toast con variantes** (success/warning/danger), **validación inline por campo** (`aria-invalid`), o **skeleton/loading** (hoy inexistente, necesario si se añade backend).
