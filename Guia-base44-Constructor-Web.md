# Guía: construir LR Coaching en base44 (constructor web, sin código)

Esta guía te lleva de cero a una app real multiusuario (coach + atletas, con login y datos compartidos) usando el constructor por IA de base44. Tu prototipo (`plataforma-coaching.html`) es la **referencia visual y funcional**; este documento es el **plano** que le entregas a base44.

---

## Paso 1 · Crear cuenta y app
1. Entra a **https://base44.com** y crea una cuenta (con Google o email).
2. Pulsa **crear app nueva** ("Create app" / "New app").
3. Cuando te pida describir tu app, **pega el Prompt Maestro** del Paso 2 (abajo). base44 generará la primera versión.

> base44 construye la app a partir de tu descripción: te crea la base de datos, el login y el hosting automáticamente. No necesitas escribir código.

---

## Paso 2 · Prompt maestro (cópialo y pégalo entero)

```
Crea una plataforma web de coaching de entrenamiento y nutrición para asesoramiento online, llamada "LR Coaching". Tema oscuro, moderno, con acento verde lima; el panel del coach pensado para escritorio y la vista del atleta optimizada para móvil.

ROLES Y ACCESO (con login por email y contraseña):
- COACH: es el dueño. Gestiona a todos sus atletas, diseña rutinas y planes de nutrición, revisa el progreso y chatea. Invita a sus atletas por email.
- ATLETA: entra con su cuenta y ve SOLO sus propios datos. Ve su rutina del día, registra sus series y cargas, marca comidas, reporta adherencia, ve su progreso y chatea con el coach.
- Seguridad: cada atleta solo puede ver y editar lo suyo. El coach ve y edita los datos de sus atletas. Nadie ve los datos de otro atleta.

MODELO DE DATOS (entidades):
1. Atleta: nombre, email, sexo, edad, altura (cm), % de grasa, categoría, objetivo, modo de asesoría (Entrenamiento y nutrición / Solo entrenamiento / Solo nutrición), nivel de experiencia (principiante/intermedio/avanzado), fase (introducción/acumulación/mantenimiento/regeneración/pérdida), bloque (1-4), prioridad por grupo muscular, objetivo de series semanales por grupo muscular, lesiones/notas de entrenamiento, perfil de alimentación (gustos, no le gusta, alergias, intolerancias), fecha de inicio y fin de membresía, activo/inactivo. Pertenece a un coach.
2. Rutina: pertenece a un atleta. Nombre, nota de la semana, fecha de inicio, y una lista de días de entrenamiento; cada día tiene nombre y una lista de ejercicios, y cada ejercicio tiene: nombre, series, repeticiones, RIR objetivo, descanso.
3. Plan de nutrición: pertenece a un atleta. Tipo de día (normal, entreno, descanso, recarga), modo (Macros flexibles o Menú cerrado), calorías objetivo, proteína (g), carbohidratos (g), grasas (g), número de comidas, lista de comidas con sus alimentos y cantidades, notas. Un atleta puede tener varios planes (uno por tipo de día).
4. Registro de entrenamiento: pertenece a un atleta. Fecha, día realizado, series con peso/reps/RIR por ejercicio, RPE de la sesión, duración, comentario.
5. Registro de peso: atleta, fecha, peso (kg), % grasa.
6. Registro de nutrición: atleta, fecha, adherencia (1 a 5), comentario, comidas cumplidas.
7. Registro de pasos: atleta, fecha, pasos.
8. Check-in de fatiga: atleta, fecha, semana, puntuación total, respuestas.
9. Mensaje de chat: entre el coach y un atleta; quién lo envía, texto, leído, fecha.
10. Ejercicio (biblioteca compartida, la gestiona el coach): nombre, grupo muscular, categoría por patrón de movimiento (I, II, III, IV), énfasis, músculos secundarios, equipamiento, indicaciones técnicas, enlace de video.
11. Alimento (base compartida, la gestiona el coach): nombre, categoría, proteína/carbohidratos/grasa por 100 g.

FUNCIONES DEL COACH:
- Panel con la lista de atletas y su estado (empezando, activo, por finalizar, renovar, inactivo), con avisos de quién necesita atención (renovaciones, planes por finalizar) y mensajes sin leer.
- Crear y editar atletas; ver la ficha de cada uno con pestañas: Resumen, Progreso, Rendimiento, Rutina, Volumen y fase, Semana a semana, Nutrición, Registros.
- Diseñar la rutina: crear días, añadir ejercicios desde la biblioteca con series/reps/RIR/descanso.
- Gestionar el volumen semanal por grupo muscular: asignar prioridad y objetivo de series por músculo, y ver el total programado frente al objetivo.
- Diseñar la nutrición: objetivos de calorías y macros, o un menú cerrado con alimentos; suplementos; perfil de alimentación del atleta.
- Biblioteca de ejercicios y base de alimentos.
- Chat con cada atleta.

FUNCIONES DEL ATLETA:
- "Hoy": su sesión del día y sus comidas.
- Registrar series (peso, reps, RIR), RPE y duración de la sesión.
- Marcar comidas y reportar adherencia diaria; registrar peso y pasos.
- Ver su progreso (gráficas de peso, cargas, adherencia).
- Chatear con su coach.

Empieza por estas funciones núcleo y deja preparada la base de datos completa. Luego iré pidiendo mejoras.
```

> **Consejo:** pégalo tal cual la primera vez. base44 hará una primera versión funcional. No esperes que salga perfecta de golpe: se mejora **conversando** (Paso 5).

---

## Paso 3 · Activar login y roles
En los ajustes de la app (Auth / Usuarios):
- Activa **login por email y contraseña**.
- Define los dos roles: **coach** y **atleta**.
- Tú entras como coach; a los atletas los **invitas por email** desde la propia app.

---

## Paso 4 · Cargar tu biblioteca y tus alimentos
Tu prototipo ya trae una biblioteca de ejercicios y una base de alimentos muy buenas. No las pierdas:
- Dime "exporta la biblioteca y los alimentos del prototipo" y te genero un **archivo (CSV/JSON)** listo para importar en base44 (su editor de datos permite importar).
- Así no tienes que volver a teclear ejercicios ni macros.

---

## Paso 5 · Construir por fases (lo más importante)
base44 hace muy bien lo "estándar"; lo muy específico de tu metodología conviene añadirlo después, paso a paso. Orden recomendado:

1. **Fase 1 — núcleo:** lo del prompt maestro (atletas, rutina, nutrición, registros, chat, progreso). Que funcione el login y que un atleta solo vea lo suyo.
2. **Fase 2 — ciencia del volumen:** pídele que añada, por grupo muscular, los **landmarks VME / VMA / VMR** (volumen mínimo eficaz / máximo adaptativo / máximo recuperable) y que el objetivo recomendado dependa de experiencia + fase + prioridad, con aviso si te pasas del VMR. (Te paso el detalle exacto cuando llegues aquí.)
3. **Fase 3 — métricas avanzadas:** RIR objetivo por fase, 1RM estimado, y el ratio de carga aguda:crónica (ACWR) para riesgo de lesión.

Para cada mejora, escríbele frases concretas tipo: *"En la pestaña Volumen, muestra para cada grupo muscular su banda recomendada de series y avísame si el total programado supera el máximo recuperable."*

---

## Paso 6 · Cuando lo tengas, dímelo
Pásame el **enlace de tu app** o el **App ID** y te ayudo a:
- afinar los prompts para que quede igual o mejor que el prototipo,
- revisar que los permisos estén bien (que un atleta no vea a otro),
- exportar/cargar tu biblioteca y alimentos,
- y planear las fases 2 y 3 (la parte científica).

---

### Recordatorio
Tu prototipo (`plataforma-coaching.html`) sigue intacto y funcional como **referencia y demo**. No lo borres: es la mejor guía visual de cómo quieres que se vea y se comporte la app real.
```
