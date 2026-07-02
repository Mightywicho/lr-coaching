# Auditoría multi-coach — LR Coaching

Fecha: 2026-06-26 · Archivo auditado: `index.html` (commit `ab94962`) · Alcance: solo lectura, sin tocar código.
Áreas: alta de coach nuevo, flujo de invitación atleta→coach, aislamiento RLS coach-vs-coach.

## Resumen ejecutivo

El modelo soporta multi-coach en lo esencial: cada coach tiene su `app_state`, `athlete_access` liga atleta↔coach, y las 5 series viven en tablas con `coach_uid`/`athlete_uid`. La rama de coach nuevo ya arranca limpia y el seed demo (Jay/ETTO) es código muerto.

Hay **3 riesgos que conviene cerrar antes de abrir la app a varios coaches** y un punto que **no puedo verificar desde el repo** (las políticas RLS y las RPC viven en Supabase, no hay SQL en el código). Lo más importante: un atleta sin vínculo se convierte silenciosamente en "coach" con app vacía (C1), y los atletas escriben el blob de su coach (C2).

Prioridad: 🔴 alto · 🟠 medio · 🟢 bajo / nota.

---

## 🔴 C1 — Un atleta sin `athlete_access` se vuelve "coach" con estado vacío

**Dónde:** `initAfterAuth` (línea 4187) + `loadStateFromSupabase` (línea 905).

`initAfterAuth` lee `athlete_access` por `athlete_uid`; si no hay fila, `_coachUid` se queda en `user.id` y `_currentUserId='coach'`. Luego `loadStateFromSupabase` ve `_coachUid===_supabaseUser.id` → entra a la rama de coach nuevo → **crea un estado de coach limpio para un usuario que es atleta.**

Esto se dispara si: la RPC `use_athlete_invite` falló (su error no se revisa, línea 1509), el atleta confirmó email mucho después, o `athlete_access` quedó sin fila por cualquier carrera. El síntoma es confuso: el atleta "entra" pero ve un panel de coach vacío.

**Causa raíz:** la decisión coach/atleta depende solo de si existe la fila `athlete_access`, ignorando `user_metadata.role` (que sí se setea en signup y nunca se lee).

**Fix propuesto:** en `initAfterAuth`, leer el rol del metadata. Si `role==='athlete'` pero no hay fila de acceso, **no** caer a la rama de coach: mostrar "Tu cuenta aún no está vinculada a un coach. Pide a tu coach un código nuevo." Y guardar la rama de bootstrap de coach solo para `role==='coach'`.

```js
// initAfterAuth, tras leer access:
const role=(user.user_metadata||{}).role;
if(role==='athlete' && !access){
  $('#app').innerHTML='<...mensaje de cuenta no vinculada...>';
  return;                      // nunca bootstrap de coach
}
```

Y en `loadStateFromSupabase`, condicionar la rama de creación a `role==='coach'` además de `_coachUid===user.id`.

---

## 🔴 C2 — Los atletas escriben el blob `app_state` de su coach

**Dónde:** `saveState` (línea 926) escribe `app_state` con `user_id:_coachUid`. Para un atleta, `_coachUid` es **su coach**. Hay 64 llamadas a `saveState()`; el atleta dispara varias (p. ej. `chat-send`, línea 1515, porque el chat vive en el blob y `stateForCloud` no lo excluye).

**Consecuencia:**
1. **RLS abierta a la fuerza:** para que esto funcione, la política `with check` de `app_state` tiene que permitir que un atleta escriba la fila de su coach. Eso es un permiso ancho — un atleta puede sobrescribir rutinas/planes del coach.
2. **Clobbering último-en-escribir:** coach y atleta editan el mismo blob; sin control de versión, una guardada pisa la otra. Es justo el riesgo de concurrencia que el handoff dejaba "opcional".

**Alternativas (de menor a mayor esfuerzo):**
- **Mínima:** sacar el `chat` del blob a una tabla `chat_messages` con RLS (igual que las 5 series). Así el atleta deja de escribir `app_state` por completo, y la política de `app_state` puede cerrarse a `user_id=auth.uid()` para escritura (atleta solo lee). **Recomendada** — cierra C2 con poco código y reusa el patrón ya probado.
- **Media:** migrar rutinas y planes de nutrición a tablas (lo "opcional" del handoff). Habilita multi-dispositivo del coach y elimina el blob compartido como punto de escritura concurrente.
- **Parche:** dejar el blob pero separar la política de SELECT (atleta puede leer coach) de la de escritura (solo coach). Requiere que el atleta NUNCA llame `saveState` → mover chat igualmente. Equivale a la opción mínima.

---

## 🟠 C3 — `loadStateFromSupabase` puede pisar el estado de un coach existente ante un error transitorio

**Dónde:** línea 902, `.single()`. Si la consulta devuelve `data=null` por **cualquier** motivo (RLS, red, 0 filas), el código no distingue "no hay fila" de "error" y cae a la rama de creación → genera estado limpio → `saveState()` (línea 911) lo sube. Para un coach con datos, un fallo transitorio podría **sobrescribir su blob con uno vacío.**

**Fix:** usar `.maybeSingle()` y separar casos:
```js
const{data,error}=await supa.from('app_state').select('state').eq('user_id',_coachUid).maybeSingle();
if(error){ /* mostrar error, NO crear estado vacío */ return; }
if(data&&data.state){ S=data.state; ...; return; }
// solo aquí (sin error y sin fila) crear estado nuevo, y solo si role==='coach'
```

---

## 🟠 C4 — Validación de invitaciones por SELECT directo (anon) en vez de RPC

**Dónde:** `auth-ath-signup` (línea 1502) hace `supa.from('athlete_invites').select('*').eq('code',code)` **sin sesión** (el atleta aún no existe). Eso obliga a que `athlete_invites` sea legible por el rol anónimo. Si la política de SELECT es `using(true)`, cualquiera puede **enumerar todos los códigos** (y el `athlete_id` asociado).

Nota: el alta de **coach** sí usa una RPC (`check_invite_code`, línea 1469) — más segura. El alta de **atleta** debería hacer lo mismo.

**Fix:** mover la validación del código de atleta a una RPC `SECURITY DEFINER` que reciba el código y devuelva solo válido/ inválido (sin exponer la tabla). Mantener `use_athlete_invite` como la que marca `used` atómicamente.

---

## 🟠 C5 — "Un atleta = un coach" depende de constraints que no puedo ver

**Dónde:** `initAfterAuth` usa `.maybeSingle()` sobre `athlete_access` por `athlete_uid` (línea 4187). Si hubiera **dos** filas para el mismo atleta, `.maybeSingle()` devuelve error → `access=null` → recae en C1 (atleta se vuelve coach).

**A verificar en Supabase (no está en el repo):**
- `athlete_access.athlete_uid` debe tener **UNIQUE** (garantiza un solo coach por atleta).
- `use_athlete_invite` debe ser `SECURITY DEFINER`, marcar la invitación `used=true` atómicamente y rechazar reuso; y NO crear fila duplicada en `athlete_access` (upsert por `athlete_uid`).
- Revisar el error de la RPC en el cliente (línea 1509 lo ignora hoy).

---

## 🟢 Verificación de RLS — qué confirmar en el dashboard de Supabase

No hay SQL en el repo; las políticas viven en Supabase. Reconstruidas desde cómo consulta el cliente, deberían ser:

**`app_state`** (un blob por coach):
- SELECT: `user_id = auth.uid()` (coach lee el suyo) **OR** `user_id IN (select coach_uid from athlete_access where athlete_uid = auth.uid())` (atleta lee el de su coach).
- INSERT/UPDATE (`with check`): idealmente **solo** `user_id = auth.uid()` (solo el coach escribe). Hoy esto choca con C2 — por eso la recomendación de sacar el chat del blob.

**`athlete_access`**:
- SELECT: `athlete_uid = auth.uid()` OR `coach_uid = auth.uid()`.
- Escritura: solo vía RPC `SECURITY DEFINER` (no permitir INSERT directo desde el cliente).

**Prueba de aceptación coach-vs-coach (hacer explícita):** con dos coaches A y B, cada uno con un atleta, confirmar que A no lee `app_state` ni `athlete_access` de B, y que el atleta de A no lee nada de B. El handoff ya sugería probar atleta-vs-atleta; **añadir el caso coach-vs-coach.**

---

## 🟢 Notas menores

- **`resetDemo`** (línea 1060, acción "Restablecer demo") borra `app_state` del usuario real. En producción para coaches reales esto borra datos de verdad — ocultarlo o relabelarlo ("Borrar mi cuenta") y pedir confirmación fuerte.
- **`seedState()`** (línea 491): código muerto (nunca se llama). Se puede borrar para reducir 300+ líneas de demo y peso del archivo — ojo con el truncado del mount que menciona el handoff: hacerlo en un commit aislado y verificar que termina en `</html>`.

---

## Orden sugerido para implementar

1. **C1** (fix de rol + rama atleta sin vínculo) — barato y cierra el bug más confuso.
2. **C3** (`.maybeSingle()` + no pisar estado) — barato, evita pérdida de datos.
3. **C2 opción mínima** (chat a tabla) → permite **cerrar la escritura de `app_state` a solo coach**.
4. **C4/C5** (RPC de invitación atleta + verificar UNIQUE y SECURITY DEFINER en Supabase).
5. Verificación coach-vs-coach con dos cuentas reales.

¿Quieres que arranque por C1+C3 (un solo commit, bajo riesgo) y de paso te deje el SQL de RLS/constraints para que lo pegues en Supabase?
