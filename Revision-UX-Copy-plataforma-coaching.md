# Revisión de UX copy: LR Coaching
**Fecha:** 2026-06-23 · **Voz:** español, "tú", cercano-profesional · **Alcance:** validaciones, toasts, confirmaciones, estados vacíos y CTAs reales de la app.

## Veredicto
La copy está **por encima de la media**. Los **estados vacíos** son ejemplares (qué es + por qué está vacío + cómo empezar) y los **CTAs** son específicos y orientados a la acción. No hace falta reescribir; hay 3 mejoras puntuales de alto valor y unas pocas notas menores.

> **✅ Aplicado (2026-06-23):** Mejora 1 (botones de confirmación = acción), Mejora 3 (los dos mensajes vagos) y la parte de **nombres + macros** de la Mejora 2. Los mensajes de *elegir alimento* se dejaron **sin cambios** a propósito (ver nota en Mejora 2 — al inspeccionar resultaron correctos por contexto).

---

## Lo que ya funciona (no tocar)
- **Estados vacíos** con estructura completa: *"Sin mensajes aún → Escribe el primero abajo."*, *"Sin atletas → Añade atletas para poder chatear con ellos."*, *"Aún no hay suficientes datos → Se necesitan al menos 2 registros para la gráfica."* Textbook.
- **CTAs específicos y verbo-primero**: *Crear atleta*, *Generar split*, *Renovar +4 semanas*, *Aplicar a los objetivos de macros*, *Guardar perfil*. El botón dice exactamente el resultado.
- **Confirmaciones con consecuencias**: *"Se quitará de la biblioteca. Los ejercicios ya programados… se conservan, pero perderán el vínculo (video y músculos)."* Explica el qué y el efecto, justo lo que pide el patrón.

---

## Mejora 1 — Botones de confirmación que nombren la acción (mayor impacto, 1 solo cambio)
Hoy todos los diálogos destructivos usan el genérico **"Sí, continuar"**. El patrón dice: el botón debe repetir la acción para que sea inequívoco incluso fuera de contexto. Como tus **títulos ya son la acción**, basta con usar el título como etiqueta del botón (cambio único en `confirmModal`, sin tocar las 7 llamadas).

| Diálogo (título) | Botón actual | Botón recomendado |
|---|---|---|
| Eliminar atleta | Sí, continuar | **Eliminar atleta** |
| Eliminar día | Sí, continuar | **Eliminar día** |
| Eliminar plan | Sí, continuar | **Eliminar plan** |
| Eliminar alimento | Sí, continuar | **Eliminar alimento** |
| Eliminar ejercicio | Sí, continuar | **Eliminar ejercicio** |
| Restablecer demo | Sí, continuar | **Restablecer demo** |
| Repartir objetivo | Sí, continuar | **Repartir objetivo** |

*"Cancelar" puede quedarse* — es universal y seguro. (Opcional: en borrados, "No eliminar" reduce el error de clic, pero no es necesario.)

---

## Mejora 2 — Consistencia: mismas palabras para lo mismo (principio "consistente")
Hay tripletes que dicen lo mismo de tres formas. Unifícalos:

| Concepto | Variantes actuales | Recomendado (único) |
|---|---|---|
| Falta nombre | "Pon un nombre" · "Pon el nombre" · "Pon el nombre del ejercicio" | **"Escribe el nombre del [día/ejercicio/alimento]"** (genérico: *"Escribe un nombre"*) |
| ~~Elegir alimento~~ | "Elige un alimento de la lista" · "…o usa la entrada manual" · "Elige un alimento o pon un nombre manual" | **Sin cambios (corrección):** al inspeccionar el código, cada variante es de un contexto distinto. En `meal-add-food` **no** hay entrada manual, así que "de la lista" es lo correcto; donde sí la hay, el mensaje ya la menciona. No son redundancia. |
| Falta macro | "Indica al menos un macro" · "…por 100 g" · "…(P, C o G)" | **"Indica al menos un macro (P, C o G)"** |

---

## Mejora 3 — Dos mensajes vagos (qué + cómo arreglar)
El patrón de error es *qué pasó + cómo arreglarlo*. Estos dos no lo cumplen:

| Mensaje actual | Problema | Recomendado |
|---|---|---|
| **"Valores no válidos"** | No dice qué valor ni por qué | **"Revisa los valores: deben ser números mayores que 0"** (ajusta al campo real) |
| **"Calcula primero"** | Críptico fuera de contexto | **"Calcula las calorías antes de aplicarlas"** *(verificar el contexto exacto del botón)* |

---

## Notas menores
- **Emoji**: *"Entrenamiento guardado 💪"* es el único emoji de la app. Como es el momento del atleta terminando su entreno, funciona como instante de celebración — **déjalo**; solo evita extenderlo a otros toasts para que siga siendo especial.
- **Un par de estados vacíos largos**: *"Sin comidas definidas → Si no defines comidas, el atleta verá un reparto estimado (objetivo ÷ nº de comidas). Define P/C/G…"* se acerca a texto de ayuda. Si quieres, mueve la explicación a un tooltip y deja el vacío en una línea.
- **"guardado" vs "actualizado"**: la mezcla parece intencional (crear vs editar). Si es así, mantenla; solo asegúrate de que "guardado" sea siempre alta y "actualizado" siempre edición.

---

## Localización
Ya está en español neutro con "tú" consistente — bien para LATAM y España. Si en el futuro traduces: el inglés es ~15–20% más corto, así que los toasts y CTAs no correrán riesgo de desbordar; al revés, vigila el alemán/francés en los botones estrechos. Evita modismos regionales (no hay ninguno ahora, mantenlo así).
