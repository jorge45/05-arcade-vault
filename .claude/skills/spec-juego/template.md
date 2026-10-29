# Plantilla para una spec útil

Este archivo es la referencia que consulta la skill `/spec-juego` al generar specs. Cada sección incluye su propósito y un ejemplo mínimo. **No es texto para copiar literal** — es la forma que la skill debe respetar.

---

## Encabezado

Toda spec empieza con metadatos en una cita (blockquote), sin tablas ni bloques, simple como se muestra abajo:

```markdown
# SPEC NN — Título corto y descriptivo

> **Estado:** Draft · **Depende de:** SPEC 05, SPEC 06 · **Fecha:** YYYY-MM-DD
> **Objetivo:** Una sola frase. Si necesitas dos frases, la feature es demasiado grande.
```

**Estados válidos:** `Draft`, `En revisión`, `Aprobado`, `Implementado`, `Obsoleto`.

**Regla del objetivo:** una sola frase que una persona lee en 5 segundos y entiende qué se va a construir. Si no cabe en una frase, divide la feature.

---

## Sección 1 — Por qué existe esta spec (opcional)

Para specs que toman decisiones no obvias o rompen patrones del proyecto, una sección breve explicando el **por qué** del trabajo. No el qué — el qué viene después.

Para specs simples, se omite.

---

## Sección 2 — Alcance

Dos sub-bloques explícitos. **Ambos son obligatorios.**

```markdown
## Alcance

**Incluye:**

- Cosa concreta uno.
- Cosa concreta dos.

**Fuera de alcance (para futuros specs):**

- Algo que podría hacerse pero no ahora.
- Algo que surgió en la conversación pero no entra.
```

**Por qué importa "fuera":** captura lo que el usuario mencionó durante la fase de preguntas pero se decidió postergar. Sin ese registro, durante la implementación habrá tentación de meterlo "ya que estamos".

---

## Sección 3 — Modelo de datos

Las estructuras concretas que aparecen o cambian. Usa código real, no pseudocódigo abstracto.

Para una spec de juego nuevo, el default es reutilizar el esquema ya existente de SPEC 06 (tablas `games`/`scores`) y documentar solo la fila nueva que se inserta en `games`, más el contrato de componente React que seguirá la implementación:

```markdown
## Modelo de datos

No se crean tablas nuevas; se reutilizan `games`/`scores` de SPEC 06. Se inserta una fila
nueva en `games` con `id=<slug>`.

\`\`\`ts
// Fila nueva en la tabla games (sin columna `best`, se calcula en vivo desde `scores`)
{
id: "<slug>",
title: "<TÍTULO>",
short: "...",
long: "...",
cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS",
cover: "cover-<slug>",
color: "cyan" | "magenta" | "yellow" | "green",
plays: "0",
}

// Contrato del componente del juego (análogo a AsteroidsGameProps/AsteroidsGameHandle
// en components/AsteroidsGame.tsx:5-13)
interface <Nombre>GameProps {
paused: boolean;
onStats: (stats: { score: number; lives: number; level: number }) => void;
onGameOver: () => void;
}
interface <Nombre>GameHandle {
forceGameOver: () => void;
}
\`\`\`
```

Si la feature introduce datos genuinamente nuevos (columnas o tablas más allá de `games`/`scores`), documéntalos aquí con el mismo nivel de detalle y justifica por qué el esquema existente no basta.

---

## Sección 4 — Plan de implementación

Pasos numerados. Cada paso debe dejar el sistema en un estado **funcional y ejecutable**. Nada de "implementar la mitad y seguir mañana".

Para una spec de juego nuevo, el plan debe cubrir, como mínimo (ajustando nombres y orden según el caso):

```markdown
## Plan de implementación

1. Crear `components/<Nombre>Game.tsx` portando la mecánica del template elegido (o
   construida desde cero) siguiendo el contrato de la sección "Modelo de datos"
   (`"use client"`, `forwardRef` + `useImperativeHandle` exponiendo `forceGameOver`,
   estado mutable dentro de un único `useEffect`, loop con `requestAnimationFrame`
   con cleanup, `onStats` disparado solo cuando el valor cambia).
2. Conectar `components/GamePlayer.tsx` para el nuevo `game.id` — si ya existe un
   segundo juego real además de Asteroides, generalizar la rama
   `isAsteroides = game.id === "asteroides"` (hoy en la línea 12) a un registro en
   vez de encadenar más `if/else`; si este es el primer juego nuevo, dejar la
   decisión final (registro vs. otro `if`) para el trabajo de implementación.
3. Añadir la clase `.cover-<slug>` en `app/globals.css` siguiendo el patrón CSS puro
   de `.cover-asteroides`/`.cover-rocas`.
4. Insertar la fila del juego en la tabla `games` de Supabase (reutilizando el
   esquema de SPEC 06, sin migración nueva salvo que esta spec pida explícitamente
   una columna nueva).
5. Verificar con `npm run lint`, `npm run build`, y prueba manual en `npm run dev`
   (jugar el juego, guardar un score, confirmar que aparece en `/juego/<slug>` y en
   `/salon-de-la-fama`).
```

**Reglas:**

- Cada paso debe poder commitearse por sí solo.
- Si un paso requiere más de 30–50 líneas de código, divídelo.
- El último paso del plan **no** es "probar todo" — eso son los criterios de aceptación.

---

## Sección 5 — Criterios de aceptación

Checklist booleano. Cada ítem se puede verificar con sí o no.

```markdown
## Criterios de aceptación

- [ ] El juego carga sin errores en consola.
- [ ] El nuevo juego aparece en la Biblioteca y en el Home sin alterar los demás.
- [ ] Guardar una puntuación la inserta en `scores` con `game_id="<slug>"`.
- [ ] El leaderboard del juego en `/juego/<slug>` refleja la puntuación guardada.
```

**Anti-patrones a evitar:**

- ❌ "Que funcione bien." → no verificable.
- ❌ "Buena UX." → subjetivo.
- ✅ "Al llegar a 0 vidas se abre el modal real de fin de juego." → verificable, booleano.

---

## Sección 6 — Decisiones tomadas y descartadas

La sección con más valor dentro de 3 meses. Captura **qué se consideró**, no solo qué se eligió.

```markdown
## Decisiones

- **Sí:** reutilizar las tablas `games`/`scores` existentes. Ya son genéricas desde SPEC 06.
- **No:** crear una tabla específica para este juego. Innecesario, el esquema ya cubre el caso.
- **Sí:** portar el template `0X-nombre` tal cual, adaptando solo el contrato de componente.
- **No:** rediseñar la mecánica del template. Fuera de alcance de esta spec.
```

Cada decisión idealmente tiene una razón breve. Las decisiones sin razón son las primeras que se cuestionan después.

---

## Sección 7 — Riesgos identificados (opcional)

Solo cuando hay riesgos no obvios. Tabla simple:

```markdown
## Riesgos

| Riesgo                                                           | Mitigación                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| Listeners de teclado quedan activos tras desmontar               | Cleanup en el `useEffect`, igual que en `AsteroidsGame.tsx`.     |
| Canvas con resolución fija se ve borroso si cambia el contenedor | Depender del `.crt-screen` 4:3 ya probado, igual que Asteroides. |
```

Para specs pequeñas o muy acotadas, se omite.

---

## Sección final — Qué NO incluye (refuerzo)

Repetir explícitamente al final lo que **no** se va a hacer en esta spec. Esta repetición es deliberada — la sección Alcance ya lo dice, pero al final del documento sirve de recordatorio cuando alguien lee solo las últimas líneas.

```markdown
## Qué **no** incluye esta spec

- Implementación del código (eso es trabajo posterior a esta spec, no cubierto por
  la skill que la generó).
- Controles táctiles/móviles.
- Sonido/audio.
- Migración de otros juegos mock existentes.

Cada uno de estos, si se necesita, va en su propio spec.
```

---

## Reglas globales sobre todo el documento

- **Una frase por idea.** Si una frase tiene dos comas y un punto y coma, divídela.
- **Nombres concretos.** Si dices "el componente del juego", di `components/<Nombre>Game.tsx`. Si dices "una tabla", da el nombre exacto.
- **Sin TODOs.** Un TODO en una spec significa que la decisión no se tomó. Tómala o anótala como decisión pendiente con una razón.
- **Sin código ejecutable largo.** La spec describe; el código se escribe después. Snippets cortos para ilustrar estructuras de datos están bien; funciones completas no.
- **Markdown estándar.** Sin extensiones raras. Debe renderizar en GitHub sin sorpresas.
