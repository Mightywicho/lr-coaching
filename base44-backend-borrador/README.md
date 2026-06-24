# Backend base44 — borrador listo para empujar

Estos son los esquemas de entidad de LR Coaching, listos para usarse cuando conectes tu proyecto base44.

## Cómo activarlo (cuando quieras hacer el bloque 4)

1. Desde la carpeta del proyecto:
   ```bash
   npx base44 login
   npx base44 create lr-coaching --path .
   ```
2. Copia estos `.jsonc` a `base44/entities/` (los crea `base44 create`).
3. Empuja las entidades y la auth:
   ```bash
   npx base44 entities push
   npx base44 auth password-login enable
   ```
4. Avísame: yo defino las reglas RLS (ver §5 del Plan), cambio la capa de persistencia (`loadState`/`saveState` → SDK) y añado estados de carga.

## Entidades (11)

| Archivo | Entidad | Filas por… |
|---|---|---|
| athlete.jsonc | Athlete | 1 por atleta (perfil) |
| routine.jsonc | Routine | 1 por atleta (rutina activa) |
| nutrition-plan.jsonc | NutritionPlan | 1 por tipo de día |
| workout-log.jsonc | WorkoutLog | 1 por sesión |
| weight-log.jsonc | WeightLog | 1 por pesaje |
| nutrition-log.jsonc | NutritionLog | 1 por día |
| steps-log.jsonc | StepsLog | 1 por día |
| fatigue-checkin.jsonc | FatigueCheckin | 1 por semana |
| chat-message.jsonc | ChatMessage | 1 por mensaje |
| exercise.jsonc | Exercise | biblioteca compartida |
| food.jsonc | Food | base de alimentos compartida |

> Nota: `id`, `created_by`, `created_date` y `updated_date` los añade base44 automáticamente — no se definen aquí.

Detalle completo del modelo, RLS y migración: ver `../Plan-Produccion-y-Arquitectura-Backend.md`.
