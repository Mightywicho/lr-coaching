# Plan de salida a producción — LR Coaching (producto real multiusuario)
**Fecha:** 2026-06-23 · **Fuente:** `plataforma-coaching.html` (3.806 líneas, SPA vanilla JS) · **Objetivo:** que coach y atletas entren desde sus propios dispositivos con login real y datos compartidos.

---

## 0. Resumen ejecutivo

Hoy la app es un **prototipo de un solo archivo** que guarda todo en `localStorage` y entra por **selector de usuario sin contraseña**. Funciona perfecto como demo en un dispositivo, pero **no es multiusuario**: los datos del coach no llegan al atleta porque viven en navegadores distintos y no hay sincronización ni seguridad.

Para convertirlo en producto real necesitamos tres cosas: **autenticación** (login por email/contraseña con roles), **base de datos compartida** (los registros del atleta y los planes del coach en el mismo sitio) y **seguridad por fila** (cada atleta solo ve lo suyo; el coach ve a sus atletas). La vía recomendada es **base44** (BaaS), porque ya tienes las skills instaladas y porque su modelo de entidades + RLS encaja con tu objeto de estado `S` casi 1 a 1.

**La buena noticia:** no hay que reescribir la app. Tu arquitectura (un objeto `S` + una función `render()` que reconstruye la vista) es ideal para una **migración por capa de persistencia**: mantenemos `S` como caché en memoria y toda la UI intacta, y solo cambiamos ~30 funciones que leen/escriben (`loadState`, `saveState`, los handlers `*-save`) para que hablen con base44. Riesgo bajo, esfuerzo acotado.

---

## 1. Por qué no es multiusuario tal cual (el bloqueante)

| Pieza actual | Implicación al subirlo | Qué exige el producto real |
|---|---|---|
| `localStorage` por navegador | Cada dispositivo tiene su copia; el coach y el atleta **no comparten datos** | Base de datos en la nube |
| Login = selector de usuario, sin clave | Cualquiera entra como coach con un clic | Autenticación real + roles |
| Sin permisos | Todo el estado es visible/editable | Seguridad por fila (RLS) |
| Persistencia síncrona, sin estados de carga | Al añadir red, la UI "se congela" sin avisar | Estados de carga/error por vista |
| Datos demo (Jay/Etto) precargados | Se ve a medio terminar en una cuenta real | Arranque limpio + invitaciones |

---

## 2. Arquitectura objetivo (base44)

```
Atleta (móvil)  ─┐
                 ├─►  base44  ─►  Auth (email/clave, roles)
Coach (web/PC)  ─┘               ─►  Entidades (datos, RLS por fila)
                                  ─►  Hosting SPA (sirve la app)
                                  ─►  (opcional) Funciones Deno, IA, subida de archivos
```

- **Auth:** email + contraseña (`base44 auth password-login enable`); opcional Google. Rol `coach` | `athlete` como campo. El coach **invita** a cada atleta por email (`users.inviteUser`); el atleta pone su clave y entra a lo suyo.
- **Entidades:** 11 colecciones (ver §4), con seguridad por fila.
- **Hosting:** base44 sirve la SPA (un `index.html`). HTTPS y dominio incluidos.
- **SDK:** llamadas asíncronas `base44.entities.X.create/list/filter/get/update/delete/subscribe` y `auth.me()`.

---

## 3. Estrategia de migración de bajo riesgo (no es reescritura)

El patrón clave: **`S` deja de ser la fuente de verdad y pasa a ser una caché**. La fuente de verdad es base44.

1. **Hidratar al entrar.** Tras `auth.me()`, según el rol, se cargan las entidades necesarias y se ensamblan en la **misma forma `S`** que la UI ya espera. `render()` no cambia.
2. **Escritura write-through.** Cada mutación (hoy centralizada en el mapa `ACTIONS` y en ~30 handlers `*-save`) llama a `base44.entities.X.create/update/delete` (await), actualiza `S` y re-renderiza. Cambio acotado y mecánico.
3. **Sesión.** Se sustituye `getSession/setSession` (localStorage) por `auth.me()` y `auth.login...`.
4. **Estados de carga/error.** Se añaden skeletons/spinners y manejo de error de red (hoy inexistentes porque localStorage es síncrono).
5. **Tiempo real.** `ChatMessage.subscribe()` para el chat; opcional en el panel del coach.

> Qué **no** se toca: el motor de programación (landmarks VME/VMA/VMR, RIR por fase, ACWR, 1RM), los auto-generadores, los componentes, el CSS y el sistema de diseño. Todo eso sobrevive intacto.

---

## 4. Modelo de datos: estado actual `S` → entidades base44

`id`, `created_by`, `created_date` y `updated_date` los añade base44 automáticamente. La propiedad de fila se resuelve con `created_by` (coach) y con campos explícitos `athlete_id` / `user_email`.

| Entidad | Origen en `S` | Campos clave | Quién escribe |
|---|---|---|---|
| **Athlete** | `users[]` + `athletes{}.profile` | user_email, name, category, goal, sex, age, body_fat, service, experience, phase, block, priorities`{}`, vol_targets`{}`, training`{}`, diet_profile`{}`, supplements`[]`, mem_start, mem_end, inactive | Coach |
| **Routine** | `athletes{}.routine` | athlete_id, name, week_note, start_date, days`[]`, baseline`{}`, snapshots`[]`, changelog`[]` | Coach |
| **NutritionPlan** | `athletes{}.nutrition.plans[]` | athlete_id, name, type, mode, kcal, protein, carbs, fat, meals_per_day, meals`[]`, notes, is_active | Coach |
| **WorkoutLog** | `logs.workouts[]` | athlete_id, date, day_id, day_name, sets`{}`, rpe, duration_min, comment | Atleta |
| **WeightLog** | `logs.weight[]` | athlete_id, date, kg, body_fat | Atleta |
| **NutritionLog** | `logs.nutrition[]` + `logs.meals[]` | athlete_id, date, adherence, comment, meals_done`[]` | Atleta |
| **StepsLog** | `logs.steps[]` | athlete_id, date, steps | Atleta |
| **FatigueCheckin** | check-ins de fatiga | athlete_id, date, week, total, items`{}` | Atleta |
| **ChatMessage** | `athletes{}.chat[]` | athlete_id, sender (coach/athlete), text, read | Ambos |
| **Exercise** | `library[]` | name, group, cat, focus, secondary`[]`, equipment, cues, video | Coach |
| **Food** | `foods[]` | name, cat, protein, carbs, fat (por 100 g) | Coach |

Los esquemas `.jsonc` listos para empujar están en `base44-backend-borrador/entities/` (este mismo proyecto).

**Decisión de modelado:** las series temporales (Workout/Weight/Nutrition/Steps/Fatigue) y el chat van como **filas independientes** (escalables, consultables, tiempo real). El perfil, la rutina y los planes van como **un documento por atleta** con arrays/objetos anidados, porque la UI los lee completos de una vez.

---

## 5. Seguridad por fila (RLS) — intención

| Entidad | Coach | Atleta |
|---|---|---|
| Athlete | Lee/escribe los suyos (`created_by == coach`) | Lee solo su ficha (`user_email == yo`) |
| Routine, NutritionPlan | Lee/escribe los de sus atletas | Lee solo lo suyo |
| WorkoutLog, WeightLog, NutritionLog, StepsLog, FatigueCheckin | Lee (y puede escribir) los de sus atletas | Crea/lee **solo los propios** |
| ChatMessage | Lee/escribe el hilo de su atleta | Lee/escribe **su** hilo |
| Exercise, Food | Lee/escribe (su biblioteca) | **Solo lectura** |

> Las reglas RLS exactas (JSON) se definen al cablear (bloque 4) con la referencia `rls-examples.md`. La prueba de aceptación es: **un atleta no puede leer datos de otro atleta**.

---

## 6. Secuencia de trabajo y qué necesito de ti

**Hecho / en curso por mi parte (no requiere backend):**
- ✅ Plano de arquitectura y modelo de datos (este documento).
- ✅ Borradores de entidades `.jsonc`.
- ⏳ Asistente de alta del coach + defaults recomendados (UI, sobrevive la migración).
- ⏳ Quick wins de estética y orden.
- ⏳ SEO + PWA (meta, favicon, manifest, service worker).

**Lo que necesito de ti para el backend (bloque 4):**
1. Cuenta en **base44** (gratis para empezar).
2. Iniciar sesión y crear el proyecto desde la carpeta del proyecto:
   ```bash
   npx base44 login
   npx base44 create lr-coaching --path .
   ```
   (o conectarlo si ya tienes un app id). Avísame cuando exista `base44/config.jsonc` y yo empujo entidades, auth y RLS, y cambio la capa de persistencia.
3. Una decisión: **invitar atletas por email** (recomendado) vs. que tú crees sus credenciales.

---

## 7. Decisiones abiertas (para optimizar)

- **Fotos de progreso y vídeos de ejercicios:** hoy los vídeos son enlaces. Con base44 podemos subir archivos (`integrations.Core.UploadFile`). ¿Lo quieres en v1 o v2?
- **Tiempo real:** chat con `subscribe()` desde el día 1 (recomendado) o refresco manual.
- **IA:** los auto-generadores actuales son determinísticos (mejor: predecibles y gratis). base44 ofrece `InvokeLLM` si más adelante quieres, p. ej., resúmenes de progreso en lenguaje natural.
- **App móvil:** con PWA (bloque 5) el atleta "instala" la web en su móvil. Una app nativa de tienda sería una fase posterior.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Asincronía en toda la app | Estados de carga/error + write-through centralizado |
| Reglas RLS mal puestas (fuga de datos) | Pruebas explícitas atleta-vs-atleta antes de lanzar |
| Conversión archivo único → proyecto | Se mantiene el código de la app intacto; solo se añade SDK y se cambia persistencia |
| Documentos grandes (rutina con todos los días) | Aceptable a esta escala; si crece, separar Day/Exercise en entidades |
| Pérdida de datos en pruebas | Export JSON ya existente como respaldo + entorno de prueba antes de producción |
