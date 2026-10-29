---
name: spec-juego
description: Diseña la spec de un juego nuevo para Arcade Vault (mecánica, origen del template, integración con el leaderboard de Supabase). Hace preguntas antes de escribir nada y guarda specs/NN-slug.md en Draft. No implementa código.
disable-model-invocation: true
argument-hint: "nombre del juego o slug de un template en started-games"
---

# /spec-juego — Diseñador guiado de specs de juegos nuevos

Esta skill ayuda a producir una spec útil para agregar **un juego jugable nuevo con su leaderboard** a Arcade Vault, siguiendo el método spec-driven del proyecto. **Aquí no se escribe código.** Tu trabajo es ayudar al usuario a aclarar qué juego quiere agregar, preguntar cuando algo no esté suficientemente definido, y desarrollar la spec sección por sección hasta que esté lista para guardarse en `specs/`.

**Fuera de alcance de esta skill:** implementar el código del juego, tocar `components/GamePlayer.tsx`, crear/migrar tablas de Supabase, o cualquier otra acción de escritura fuera de `specs/`. Esta skill termina cuando el archivo `.md` queda guardado en `Draft`.

## Filosofía

Una spec de juego no es documentación decorativa. Es el contrato que guía la implementación posterior — tanto la mecánica del juego como su conexión al leaderboard real. Si la spec es vaga, el código va a improvisar. Por eso este flujo es **deliberadamente lento durante la definición** y **rápido durante la escritura**.

Lee `template.md` (en el mismo directorio que esta skill) para ver la estructura completa que seguirá la spec. Apóyate en él en cada paso.

## Flujo del comando

- Sigue las cuatro fases en orden. **No te saltes fases.** Si el usuario quiere ir más rápido, recuérdale que el costo de una spec mala se paga después en código.
- Tus respuestas deben estar en el mismo idioma del prompt inicial. Este proyecto usa español en sus specs (01-06), así que por defecto responde en español salvo que el usuario escriba en otro idioma.

### Fase 1 — Entender el contexto

Antes de preguntar sobre el juego, asegúrate de tener contexto del proyecto:

1. Lee `CLAUDE.md` si existe.
2. Lista el contenido de `specs/` para ver qué specs ya existen y cómo están numeradas.
3. Lee explícitamente `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-tabla-de-juegos-supabase.md` — son la referencia de convenciones ya probadas en este repo: cómo se porta un juego a React (contrato `paused`/`onStats`/`onGameOver`/`forceGameOver`, ver `components/AsteroidsGame.tsx:5-13`) y cómo se conecta al leaderboard (tablas `games`/`scores` en Supabase, ver sección "Modelo de datos" de SPEC 06).
4. Lista `references/resources/templates/started-games/` para ver qué templates de juego hay disponibles para portar. A la fecha de escribir esta skill: `02-asteroids` (ya integrado como "asteroides"), `03-tetris`, `04-arkanoid` (ninguno de estos dos últimos integrado aún). Esta lista puede crecer — siempre vuelve a listar la carpeta en vez de asumir que esta es exhaustiva.
5. Pregunta al usuario si el juego nuevo:
   - **Parte de un template existente** de `started-games/` → en ese caso, lee su `game.js`, `index.html` y `CLAUDE.md` (si existe) para extraer la mecánica, los controles, el estado del juego y los assets usados, antes de pasar a la Fase 2.
   - **Se construye desde cero** → en ese caso pide al usuario una descripción de la mecánica antes de pasar a la Fase 2.

Si el argumento `$ARGUMENTS` viene vacío, pregunta al usuario qué juego quiere agregar y si parte de alguno de los templates listados o va desde cero. Si `$ARGUMENTS` nombra un slug que coincide con una carpeta de `started-games/`, úsalo como punto de partida y confírmalo con el usuario.

### Fase 2 — Clarificar con preguntas

Esta es la fase más importante. Tu trabajo es **detectar ambigüedades y preguntar**, no asumir.

Pregunta en bloques de 3 a 5 a la vez (no una pregunta sola tras otra — eso cansa). Después de cada bloque, espera la respuesta antes de seguir.

**Categorías de preguntas a cubrir siempre, específicas de este dominio:**

- **Identidad del juego:** `id`/slug (minúsculas, sin espacios — va a ser `game_id` en Supabase y parte de la ruta `/juego/<slug>`), título para mostrar, copy corto y largo.
- **Clasificación:** categoría — debe ser una de `ARCADE`/`PUZZLE`/`SHOOTER`/`VERSUS` (mismo enum que la columna `games.cat`); color — debe ser uno de `cyan`/`magenta`/`yellow`/`green` (mismo enum que `games.color`).
- **Mecánica y controles:** cómo se juega, qué teclas controlan qué, qué constituye "perder una vida" o "game over", si hay niveles, si hay power-ups.
- **Puntuación:** cómo se calcula el score, si hay vidas/niveles que mostrar en el HUD (el contrato `onStats` espera `{ score, lives, level }` — si el juego no tiene vidas o niveles, aclara qué valor fijo se reporta).
- **Modelo de datos:** si el juego necesita campos nuevos en `games`/`scores` más allá del esquema ya existente. El default es que NO los necesita, porque esas tablas son genéricas desde SPEC 06 — solo levanta esto como pregunta si el juego tiene un requisito real que no cabe en `(game_id, name, score, created_at)`.

**Cómo formular las preguntas:**

- Preguntas concretas, no abiertas. ❌ "¿Cómo te imaginas la puntuación?" → ✅ "¿Cada bloque roto suma puntos fijos o varía según el nivel?"
- Cuando ofrezcas opciones, da 2–4, marca cuál es tu recomendación y por qué.
- Si detectas una respuesta que abre una caja de Pandora (ej. "y que también tenga modo multijugador"), señala que eso merece su propia spec y pregunta si lo dejamos fuera de alcance de esta.

**Cuándo dejar de preguntar:**

Detente cuando puedas responder estas tres preguntas sin asumir nada:

1. ¿Qué archivos van a aparecer o cambiar?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo verifico que la spec quedó completa?

Si todavía no puedes responder alguna, sigue preguntando.

### Fase 3 — Desarrollar la spec sección por sección

Una vez que tengas claridad, **no generes la spec completa de una sola vez**. Desarrolla las secciones del template **una por una**, mostrando cada sección al usuario y esperando confirmación antes de pasar a la siguiente.

Orden estricto (ver `template.md` para el detalle completo de cada sección):

1. **Encabezado** (estado `Draft`, dependencias — normalmente ninguna o specs previas si el juego reutiliza algo específico de ellas, fecha, objetivo en una sola frase).
2. **Alcance** (qué incluye y qué NO). El "no incluye" debe ser explícito, y siempre debe mencionar que la implementación del código queda fuera de lo que esta skill produce.
3. **Modelo de datos.** Default: _"No se crean tablas nuevas; se reutilizan `games`/`scores` de SPEC 06. Se inserta una fila nueva en `games` con `id=<slug>`."_ Documenta también el contrato de componente (`<Nombre>GameProps { paused, onStats, onGameOver }`, `<Nombre>GameHandle { forceGameOver }`) análogo al de `components/AsteroidsGame.tsx`.
4. **Plan de implementación** (pasos numerados, cada uno deja el sistema funcional). Debe incluir, como mínimo: crear `components/<Nombre>Game.tsx` portando la mecánica siguiendo el contrato; conectar `components/GamePlayer.tsx` para el nuevo `game.id` (señalando que si ya hay un segundo juego real además de Asteroides, conviene generalizar la rama `isAsteroides = game.id === "asteroides"` — hoy en la línea 12 de `GamePlayer.tsx` — a un registro en vez de encadenar otro `if/else`, dejando la decisión final de cómo hacerlo para el trabajo de implementación); añadir clase `.cover-<slug>` en `app/globals.css`; insertar la fila del juego en la tabla `games` de Supabase; y verificar con `npm run lint`/`npm run build` + prueba manual jugando y guardando un score.
5. **Criterios de aceptación** (checklist booleano, no aspiracional).
6. **Decisiones tomadas y descartadas** (con razón breve).
7. **Riesgos identificados** (solo si aplica — si no hay riesgos relevantes, se omite).

**Después de cada sección:**

- Muéstrala formateada en markdown.
- Pregunta: "¿Esta sección queda así o quieres ajustarla?"
- Si el usuario pide cambios, aplícalos y muéstrala de nuevo.
- Solo avanza a la siguiente sección cuando el usuario confirme.

**Errores comunes a evitar:**

- Generar criterios de aceptación no verificables ("que se vea bien").
- Meter en el plan de implementación cosas que no están en el alcance.
- Asumir nombres de archivos o estructuras que el usuario no confirmó.
- Saltarte la sección de decisiones — es la que tiene más valor a largo plazo.
- Describir cómo implementar el registro de `GamePlayer.tsx` con total certeza — eso es una decisión del trabajo de implementación, no de esta spec; aquí solo se señala como consideración a resolver.

### Fase 4 — Guardar la spec

Cuando todas las secciones estén confirmadas:

1. Determina el número secuencial siguiente mirando `specs/`. Si la última es `06-leaderboard-y-tabla-de-juegos-supabase.md`, esta será `07-`.
2. Genera un slug corto a partir del objetivo (ej. `juego-tetris`).
3. Pregunta al usuario si el nombre de archivo propuesto le funciona antes de escribirlo.
4. Crea el archivo en `specs/NN-slug.md` con todas las secciones aprobadas.
5. Marca el estado como `Draft` por defecto. **No lo marques como `Aprobado` automáticamente** — eso lo hace el usuario cuando lo haya releído.
6. Confirma al usuario:
   - Ruta del archivo creado.
   - Recordatorio: la spec está en estado `Draft`. Cámbiala a `Aprobado` cuando la hayas releído.
   - Recordatorio explícito: esta skill no implementa nada — la implementación (incluida la decisión sobre cómo conectar `GamePlayer.tsx`) es trabajo posterior, fuera de esta skill.

## Reglas duras

- **Nunca escribas código durante este comando.** Solo el archivo `.md` de la spec al final.
- **Nunca toques `components/GamePlayer.tsx`, `lib/`, `app/globals.css` ni Supabase.** Esta skill solo produce el documento de spec.
- **Nunca asumas decisiones que el usuario no confirmó.** Si falta información, pregunta.
- **Nunca generes la spec completa en una sola respuesta.** Sección por sección, con confirmación.
- **Si el usuario quiere acelerar y saltarse la Fase 2**, recuérdale: "Preguntar ahora ahorra horas después. ¿Seguro que quieres saltarte las preguntas?". Si insiste, respeta su decisión pero regístralo en la sección de decisiones de la spec ("Definición rápida sin aclaración detallada").
- **Si la feature es demasiado grande** (no cabe en una frase, toca más de tres áreas del sistema, requiere decisiones en cuatro o más dominios), propón dividirla en dos o más specs antes de continuar.

## Tono al preguntar

Sé directo y específico. No te disculpes por preguntar. No uses frases como "si no te importa..." o "¿podrías tal vez...?". El usuario invocó esta skill precisamente porque quiere que preguntes. Usa preguntas concretas, una por línea cuando haya varias, numeradas para que sea fácil responder.

## Argumentos

Si el usuario invocó `/spec-juego tetris` y existe `references/resources/templates/started-games/03-tetris/`, usa ese template como punto de partida sugerido, pero confírmalo con el usuario antes de leerlo a fondo.

Si invocó `/spec-juego` sin argumentos, empieza preguntando si el juego parte de un template de `started-games/` (y cuál) o se construye desde cero.
