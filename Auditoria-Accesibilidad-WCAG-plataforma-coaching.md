# Auditoría de Accesibilidad: plataforma-coaching.html
**Estándar:** WCAG 2.1 AA · **Fecha:** 2026-06-19 · **Archivo:** `plataforma-coaching.html` (3.749 líneas)

## Resumen

**Issues encontrados:** 12 · **Críticos:** 4 · **Mayores:** 5 · **Menores:** 3

La plataforma parte de una base sólida: tema oscuro con texto principal y secundario de altísimo contraste, todas las acciones construidas sobre `<button>` nativos (teclado-operables por defecto) y un único `onclick` no interactivo. Las brechas se concentran en tres puntos de alto impacto y arreglo fácil: **etiquetas de formulario sin asociar, foco invisible en botones, y falta de roles/landmarks ARIA**. Ninguno requiere reescribir la app; la mayoría son cambios de CSS o de atributos.

### Lo que ya está bien (no tocar)
- `<html lang="es">` y `<!DOCTYPE html>` correctos.
- Texto principal `--tx` (13–16:1) y secundario `--tx2` (6,5–7,8:1) superan holgadamente 4,5:1.
- Colores de acento/estado (volt, blue, orange, red, green, purple) todos ≥ 6:1 sobre las superficies.
- Texto sobre botón primario (`--on-volt` sobre `--volt`) = 13,6:1.
- 142 botones nativos + delegación de eventos → operables con teclado sin esfuerzo extra.

---

## Hallazgos

### Perceptible (Perceivable)

| # | Issue | Criterio WCAG | Severidad | Recomendación |
|---|-------|---------------|-----------|----------------|
| 1 | ~97 `<label>` son hermanos del input **sin `for`** y sin envolverlo. Los inputs ya tienen `id` (`f_cat`, `f_age`…) pero la etiqueta no lo referencia → ningún lector de pantalla anuncia el nombre del campo. | 1.3.1 Info y relaciones | 🔴 Crítico | Añadir `for="<id>"` a cada label (los `id` ya existen) **o** envolver el input dentro del `<label>`. |
| 2 | Texto terciario `--tx3 #657183` falla contraste: 3,30–3,93:1 (req. 4,5:1) en todas las superficies. Se usa en metadatos, ayudas y placeholders. | 1.4.3 Contraste mínimo | 🔴 Crítico | Aclarar a ≥ `#7d8a9d` (~4,5:1 sobre `--card`) o limitarlo solo a texto grande (≥18,66px/24px). |
| 3 | Bordes `--line #232a36` (1,1–1,4:1) y `--line2 #2f3845` (1,4–1,6:1) no llegan a 3:1. Inputs y botones secundarios (`.btn-g`) se delimitan **solo** por ese borde → contorno casi invisible. | 1.4.11 Contraste no textual | 🟡 Mayor | Subir los bordes de controles a ≥ 3:1 (p. ej. `#4b5666` o superior). El borde decorativo entre tarjetas puede quedarse tenue. |
| 4 | 42 placeholders; varios campos usan el placeholder como **única** etiqueta (`dc_ffm`, `dc_palman`, `rm_w`…). El placeholder desaparece al escribir y hereda el color `tx3` de bajo contraste. | 1.3.1 / 3.3.2 | 🟡 Mayor | Dar a cada campo una `<label>` visible y persistente; el placeholder solo como ejemplo de formato. |
| 5 | 27 SVG en línea sin `aria-hidden="true"`. Iconos decorativos generan ruido en lectores de pantalla. Además 2 `<h1>` y salto de jerarquía (9 `<h2>` frente a 76 `<h3>`). | 1.1.1 / 1.3.1 | 🟢 Menor | `aria-hidden="true"` + `focusable="false"` en SVG decorativos. Un solo `<h1>` por vista y no saltar niveles. |

### Operable

| # | Issue | Criterio WCAG | Severidad | Recomendación |
|---|-------|---------------|-----------|----------------|
| 6 | `outline:none` global y el único `:focus` cambia el borde **solo** en input/select/textarea. Los 142 `<button>`, enlaces y el botón de cierre **no muestran foco** → quien navega con teclado no sabe dónde está. | 2.4.7 Foco visible | 🔴 Crítico | Añadir `:focus-visible` con contorno visible (p. ej. `outline:2px solid var(--volt); outline-offset:2px`) a `button, .btn, [data-act], a, input, select, textarea`. |
| 7 | El modal no gestiona el foco: al abrir no lo mueve al diálogo, al cerrar no lo restaura, no hay trampa de foco ni cierre con **Escape** (solo clic en overlay o en la X). | 2.4.3 Orden del foco · 2.1.2 | 🟡 Mayor | Al abrir, enfocar el modal; atrapar Tab dentro; cerrar con `Escape`; devolver el foco al disparador al cerrar. |
| 8 | Áreas táctiles por debajo de lo recomendado: `.btn` ≈34px, `.btn-ic` ≈32px, `.btn-sm` ≈25px de alto. | 2.5.5 (AAA) / WCAG 2.2 2.5.8 (AA, ≥24px) | 🟢 Menor | *Nota de precisión:* 44px es nivel **AAA** en WCAG 2.1; el mínimo **AA** real (2.2) es 24px y casi todo lo cumple, salvo `.btn-sm` que queda al límite. Subir a ≥24px (idealmente 44px en móvil) los botones pequeños. |

### Comprensible (Understandable)

| # | Issue | Criterio WCAG | Severidad | Recomendación |
|---|-------|---------------|-----------|----------------|
| 9 | Sin etiquetas/instrucciones asociadas (misma raíz que #1). La validación de formularios ocurre en JS pero los errores probablemente no se anuncian a tecnología asistiva. | 3.3.2 Etiquetas · 3.3.1 Identificación de errores | 🟡 Mayor | Asociar labels (#1) e identificar errores en texto con `aria-describedby`/`aria-invalid`, no solo por color. |
| 10 | *(Verificación manual pendiente)* Confirmar que ningún cambio de estado al enfocar un control altera el contexto de forma inesperada. | 3.2.1 Al recibir el foco | 🟢 Menor | Revisar que enfocar selects/inputs no dispare navegación o envíos automáticos. |

### Robusto (Robust)

| # | Issue | Criterio WCAG | Severidad | Recomendación |
|---|-------|---------------|-----------|----------------|
| 11 | Botones de solo icono sin nombre accesible: cierre del modal `<button class="x">` y `.btn-ic` contienen solo un SVG, sin `aria-label` → se anuncian como "botón" sin nombre. El modal es un `<div class="modal">` sin `role="dialog"`. | 4.1.2 Nombre, rol, valor | 🔴 Crítico | `aria-label` en cada botón de icono. Modal: `role="dialog" aria-modal="true" aria-labelledby="<id del h3>"`. |
| 12 | Sin estructura de landmarks: 0 `<main>`, 0 `<nav>`. La barra lateral es `<aside>` pero su navegación no es `<nav>`; el contenido no está en `<main>`. El ítem activo no tiene `aria-current`. | 1.3.1 / 4.1.2 | 🟡 Mayor | Envolver el contenido en `<main>`, la navegación en `<nav aria-label="Principal">`, y marcar el ítem activo con `aria-current="page"`. |

---

## Comprobación de contraste de color

| Elemento | Primer plano | Fondo | Ratio | Requerido | ¿Pasa? |
|----------|-------------|-------|-------|-----------|--------|
| Texto principal `--tx` | `#e9edf4` | `#151921` (card) | 14,99:1 | 4,5:1 | ✅ |
| Texto secundario `--tx2` | `#9aa5b6` | `#151921` | 7,07:1 | 4,5:1 | ✅ |
| **Texto terciario `--tx3`** | `#657183` | `#151921` | **3,56:1** | 4,5:1 | ❌ |
| **Texto terciario `--tx3`** | `#657183` | `#1a202b` (card2) | **3,30:1** | 4,5:1 | ❌ |
| Texto sobre botón primario | `#161f07` | `#cdf563` (volt) | 13,65:1 | 4,5:1 | ✅ |
| Acento volt como texto | `#cdf563` | `#151921` | 14,11:1 | 4,5:1 | ✅ |
| Estado rojo como texto | `#ff7066` | `#151921` | 6,51:1 | 4,5:1 | ✅ |
| **Borde de input `--line2`** | `#2f3845` | `#11141a` (bg2) | **1,56:1** | 3:1 | ❌ |
| **Borde de tarjeta `--line`** | `#232a36` | `#151921` | **1,22:1** | 3:1 | ❌ |
| Indicador de foco (volt) | `#cdf563` | `#11141a` | 14,78:1 | 3:1 | ✅ |

---

## Navegación por teclado

| Elemento | Orden Tab | Enter/Espacio | Escape | Observación |
|----------|-----------|---------------|--------|-------------|
| Botones de acción (×142) | Nativo ✅ | Activan ✅ | — | Operables, pero **sin foco visible** (#6). |
| Inputs / selects | Nativo ✅ | ✅ | — | Foco visible por borde ✅, pero sin label asociada (#1). |
| Modal | Sin gestión ❌ | — | No cierra ❌ | Falta mover/atrapar/restaurar foco y cierre con Escape (#7). |
| Barra lateral | Nativo ✅ | ✅ | — | Sin `aria-current` en ítem activo (#12). |

---

## Lector de pantalla

| Elemento | Se anuncia como | Problema |
|----------|----------------|----------|
| Campo "Categoría" | "edición, en blanco" (sin nombre) | Label sin `for` (#1). |
| Botón cerrar modal | "botón" (sin nombre) | Icono SVG sin `aria-label` (#11). |
| Iconos en botones con texto | texto + lectura del SVG | Falta `aria-hidden` (#5). |
| Apertura de modal | (nada) | No es `role="dialog"`, foco no se mueve (#7, #11). |
| Regiones de página | sin landmarks | Falta `<main>`/`<nav>` (#12). |

---

## Arreglos prioritarios (de mayor impacto / menor esfuerzo)

1. **Asociar labels (#1, #9)** — Crítico. Bloquea por completo a usuarios de lector de pantalla en *todos* los formularios. Los `id` ya existen: solo añadir `for=`. *~1 h.*
2. **Foco visible global (#6)** — Crítico. Una sola regla `:focus-visible` desbloquea a todos los usuarios de teclado. *~15 min.*
   ```css
   :focus-visible{outline:2px solid var(--volt); outline-offset:2px; border-radius:var(--r-s);}
   ```
3. **Nombres accesibles en iconos + modal como diálogo (#11)** — Crítico. `aria-label` en botones de icono y `role="dialog" aria-modal="true" aria-labelledby` en el modal. *~30 min.*
4. **Aclarar `--tx3` y bordes de control (#2, #3)** — Mayor. Dos cambios de variable CSS arreglan contraste de texto de ayuda y contorno de inputs. *~15 min.*
5. **Gestión de foco del modal + Escape (#7)** — Mayor. Mover foco al abrir, atrapar Tab, restaurar al cerrar. *~1–2 h.*
6. **Landmarks `<main>`/`<nav>` + `aria-current` (#12)** — Mayor. Mejora la navegación por regiones. *~30 min.*

> Metodología: análisis estático del HTML/CSS (paleta calculada con la fórmula de luminancia relativa WCAG, asociación label/input, handlers de teclado, roles ARIA, tamaños de control). Un audit estático detecta ~30–40% de los problemas; se recomienda completar con prueba manual de teclado y un lector de pantalla real (NVDA/VoiceOver) sobre la app en ejecución.
