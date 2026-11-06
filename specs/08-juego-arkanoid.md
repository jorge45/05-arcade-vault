# SPEC 08 — Juego real "Arkanoid"

> **Estado:** Aprobado · **Depende de:** SPEC 05, SPEC 06 · **Fecha:** 2026-11-05
> **Objetivo:** Portar el juego Arkanoid del template standalone (`references/resources/templates/started-games/04-arkanoid/`) a un componente React con id `arkanoid`, usando mouse+teclado y sprites reales, y conectarlo al Reproductor y al leaderboard real igual que Asteroides y Tetris.

---

## Alcance

**Incluye:**

- Nueva entrada en la tabla `games` de Supabase con `id: "arkanoid"`:
  - `title: "ARKANOID"`, `cat: "ARCADE"`, `color: "yellow"`, `cover: "cover-arkanoid"`, `plays: "0"`.
  - `short`: "Rompe los 10x6 bloques de cada nivel con tu paleta antes de perder las 3 bolas."
  - `long`: "Controla la paleta con el mouse o las flechas y rebota la bola para destruir los bloques de colores de cada nivel. Cada bloque roto suma puntos y dispara una pequeña explosión animada. Supera los 5 niveles, cada uno más rápido que el anterior, antes de perder tus 3 bolas."
- Nueva clase `.cover-arkanoid` en `app/globals.css`, generada en CSS puro siguiendo el mismo patrón que `.cover-asteroides`/`.cover-tetris` (gradiente de fondo + formas decorativas).
- Copia del asset `assets/spritesheet-breakout.png` del template a `public/arkanoid/spritesheet-breakout.png`, servido por Next.js vía URL estática.
- Nuevo componente cliente `components/ArkanoidGame.tsx` que porta íntegramente la lógica de `game.js`/`levels.js`/`assets/spritesheet.js` del template (paleta, bola, 10x6 bloques por nivel, colisiones AABB, explosiones animadas, 5 niveles con velocidad creciente) con estas adaptaciones:
  - Canvas montado vía `useRef`, con todo el estado del juego (paleta, bola, bloques, explosiones, score, vidas, nivel) encapsulado dentro de un único `useEffect` — nada vive en el scope global del módulo.
  - El loop `requestAnimationFrame` se inicia al montar y se cancela en el cleanup del `useEffect`; los listeners de teclado (`keydown`/`keyup` en `window`) y de mouse (`mousemove` sobre el canvas) se agregan en el mismo efecto y se remueven en el cleanup.
  - Resolución interna del canvas fija en 800×600 (igual al original), dimensionada por CSS al 100% de `.crt-screen` (`aspect-ratio: 4/3`, coincide exactamente con 800:600).
  - Se elimina `drawOverlay()` (overlay interno de "GAME OVER"/victoria) y la pantalla de pausa con botones de salto de nivel (`drawPauseOverlay`, el `click` listener del canvas y las constantes `PAUSE_BTN_*`); el canvas dibuja únicamente paleta, bola, bloques y explosiones.
  - Controles: la paleta se mueve con mouse (`mousemove` sobre el canvas, igual que el original) y con `←`/`→` simultáneamente, igual que el template original.
  - Se elimina la carga de `bounceSound`/`breakSound` y toda llamada a `.play()`; el juego no reproduce audio.
  - Props: `paused: boolean` (si es `true`, el loop sigue llamando a `draw()` pero no a `update()`); `onStats: (stats: { score: number; lives: number; level: number }) => void` (se invoca solo cuando alguno de los tres valores cambia respecto al frame anterior); `onGameOver: () => void` (se invoca una vez cuando `lives` llega a 0 **o** cuando se limpian los bloques del nivel 5, en vez de mostrar el overlay "GAME OVER"/"¡Completaste el juego!" original — ambos casos terminan la partida real de la misma forma).
  - Se expone, vía `forwardRef` + `useImperativeHandle`, un método `forceGameOver()` análogo al de `AsteroidsGame`/`TetrisGame`.
  - El reinicio ("JUGAR DE NUEVO") remonta el componente completo desde `GamePlayer` (misma `key` que cambia ya usada para los otros juegos reales), lo que reinicializa el nivel 1 desde cero.
- Modificación de `components/GamePlayer.tsx`: se agrega `"arkanoid"` al tipo `RealGameId` y al arreglo `REAL_GAME_IDS`, se importa `ArkanoidGame`, se agrega la rama de renderizado condicional (siguiendo el mismo patrón ya usado para `asteroides`/`tetris`), y una línea de ayuda de controles (`MOUSE O ← → MOVER PALETA`) visible solo cuando `game.id === "arkanoid"`.

**Fuera de alcance (para futuros specs):**

- Implementación del código (eso es trabajo posterior a esta spec, no cubierto por esta skill).
- Controles táctiles/móviles (el original no los tiene).
- Sonido/efectos de audio (`ball-bounce.mp3`/`break-sound.mp3` del template no se portan), consistente con SPEC 05.
- Los botones de salto directo de nivel en la pantalla de pausa (herramienta de debug del template original).
- Cualquier mensaje visual especial de victoria distinto del flujo normal de fin de partida (se trata igual que game over por vidas agotadas).
- Persistencia de nivel/vidas entre sesiones; solo el puntaje final se persiste en `scores` (SPEC 06).
- Migrar cualquiera de los juegos mock restantes.
- Tests automatizados.

---

## Modelo de datos

No se crean tablas nuevas; se reutilizan `games`/`scores` de SPEC 06. Se inserta una fila
nueva en `games` con `id=arkanoid`.

```ts
// Fila nueva en la tabla games (sin columna `best`, se calcula en vivo desde `scores`)
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "Rompe los 10x6 bloques de cada nivel con tu paleta antes de perder las 3 bolas.",
  long: "Controla la paleta con el mouse o las flechas y rebota la bola para destruir los bloques de colores de cada nivel. Cada bloque roto suma puntos y dispara una pequeña explosión animada. Supera los 5 niveles, cada uno más rápido que el anterior, antes de perder tus 3 bolas.",
  cat: "ARCADE",
  cover: "cover-arkanoid",
  color: "yellow",
  plays: "0",
}

// Contrato del componente (análogo a AsteroidsGameProps/AsteroidsGameHandle
// en components/AsteroidsGame.tsx:5-13)
interface ArkanoidGameProps {
  paused: boolean;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: () => void;
}
interface ArkanoidGameHandle {
  forceGameOver: () => void;
}
```

Asset estático nuevo (no es un cambio de esquema de datos, pero es la única pieza de
"modelo de datos" ajena a Supabase que introduce esta spec): `public/arkanoid/spritesheet-breakout.png`,
copiado tal cual desde `references/resources/templates/started-games/04-arkanoid/assets/spritesheet-breakout.png`.
El componente carga la imagen por URL (`/arkanoid/spritesheet-breakout.png`) en vez del
path relativo `assets/spritesheet-breakout.png` que usa el template standalone.

---

## Plan de implementación

1. Copiar `assets/spritesheet-breakout.png` del template a `public/arkanoid/spritesheet-breakout.png`.
2. Agregar la entrada `arkanoid` a la tabla `games` de Supabase (vía `apply_migration` o `execute_sql` sobre el proyecto ya conectado), con los valores de la sección "Modelo de datos".
3. Agregar la clase `.cover-arkanoid` en `app/globals.css`, siguiendo el patrón CSS puro de `.cover-asteroides`/`.cover-tetris`.
4. Crear `components/ArkanoidGame.tsx`: componente `"use client"` con `forwardRef`, `useRef` para el canvas, y un único `useEffect` que carga el spritesheet desde `/arkanoid/spritesheet-breakout.png`, inicializa paleta/bola/nivel 1, arranca el loop `requestAnimationFrame`, agrega los listeners de teclado (`window`) y mouse (`canvas`), y limpia todo (cancela el frame, remueve listeners) al desmontar. Portar `update`/`draw`/colisiones AABB/explosiones de `game.js` tal cual, sin `drawOverlay`/`drawPauseOverlay`/sonidos. Invocar `onStats`/`onGameOver` como se describe en el Alcance; exponer `forceGameOver()` vía `useImperativeHandle`.
5. Portar `levels.js` (los 5 niveles y su generador de patrones de bloques) como un módulo interno de `components/ArkanoidGame.tsx` o un archivo propio (`lib/arkanoid-levels.ts`), sin cambios de contenido respecto al template.
6. Modificar `components/GamePlayer.tsx`: agregar `"arkanoid"` a `RealGameId`/`REAL_GAME_IDS`, importar `ArkanoidGame`, agregar la rama de renderizado condicional (`realGameId === "arkanoid"`) siguiendo el patrón ya usado para `asteroides`/`tetris`, y la línea de ayuda de controles (`MOUSE O ← → MOVER PALETA`) visible solo para este juego.
7. Ejecutar `npm run lint` y `npm run build`. Luego, en `npm run dev`, verificar manualmente: la Biblioteca muestra la card "ARKANOID"; `/juego/arkanoid` muestra el detalle con su leaderboard; `/juego/arkanoid/jugar` permite jugar completo (mover la paleta con mouse y con flechas, romper bloques, perder una bola al caer fuera del canvas, pasar de nivel al limpiar todos los bloques, perder las 3 vidas o completar el nivel 5, pausar/reanudar, forzar "FIN", guardar el puntaje final, "JUGAR DE NUEVO" reinicia desde el nivel 1, "SALIR" vuelve al detalle sin dejar el loop corriendo en segundo plano).

---

## Criterios de aceptación

- [ ] `npm run dev` levanta la app sin errores en consola.
- [ ] La Biblioteca (`/biblioteca`) muestra una card nueva "ARKANOID" (categoría ARCADE), sin alterar las cards existentes.
- [ ] `/juego/arkanoid` muestra el detalle del juego con su leaderboard real (vacío al inicio), igual que cualquier otro juego.
- [ ] `/juego/arkanoid/jugar` muestra el canvas del juego real (paleta, bola, bloques con sprites) en lugar del `.game-arena` decorativo.
- [ ] Mover el mouse sobre el canvas mueve la paleta; las flechas izquierda/derecha también la mueven.
- [ ] Rebotar la bola contra un bloque lo destruye, dispara su animación de explosión y suma 10 puntos.
- [ ] Al limpiar todos los bloques de un nivel, se carga el siguiente nivel con velocidad de bola mayor; al limpiar el nivel 5, la partida termina igual que si se perdieran las 3 bolas.
- [ ] Dejar caer la bola fuera del canvas resta una vida; al llegar a 0 vidas se abre el modal "FIN DEL JUEGO" ya existente, con el puntaje final real.
- [ ] El HUD externo (Jugador/Puntuación/Vidas/Nivel) refleja en tiempo real el score/vidas/nivel reales del juego, no un ticker simulado.
- [ ] El botón "PAUSA" detiene el movimiento/colisiones del juego real (sin mostrar botones de salto de nivel); "REANUDAR" lo continúa.
- [ ] El botón "FIN" termina la partida real inmediatamente y abre el modal de fin de partida con el puntaje actual.
- [ ] Guardar el puntaje en el modal lo inserta en la tabla `scores` de Supabase con `game_id: "arkanoid"`.
- [ ] "JUGAR DE NUEVO" reinicia el juego desde el nivel 1 (score 0, 3 vidas).
- [ ] "SALIR" navega de vuelta a `/juego/arkanoid` y detiene el loop del juego (no sigue corriendo en segundo plano).
- [ ] El juego no reproduce ningún sonido.
- [ ] Los demás juegos (`rocas` y mocks, `asteroides`, `tetris`) siguen comportándose exactamente igual que antes en Biblioteca, Detalle y Reproductor.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones

- **Sí:** el juego se agrega como una entrada nueva en `games` con `id: "arkanoid"`, reutilizando el esquema de SPEC 06 sin migraciones nuevas más allá del insert.
- **Sí:** se copia el spritesheet PNG original (`spritesheet-breakout.png`) a `public/arkanoid/` y se usa tal cual, en vez de redibujar paleta/bola/bloques con formas vectoriales (como hace `AsteroidsGame`/`TetrisGame`). Decisión explícita del usuario: prioriza fidelidad visual al template original y evita reimplementar sprites que ya existen como asset.
- **No:** redibujar los sprites vectorialmente. Se descarta porque añadiría trabajo de diseño no solicitado solo para mantener consistencia estilística con los otros dos juegos reales.
- **Sí:** se mantienen ambos controles del original — mouse (`mousemove` sobre el canvas) y teclado (`←`/`→`) — en vez de reducir a solo teclado. Decisión explícita del usuario; el control por mouse es parte central de la mecánica original de un juego de paleta/Arkanoid.
- **No:** eliminar el control por mouse para ser consistente con Asteroides/Tetris (ambos solo teclado). Se descarta porque el usuario prefiere mantener fiel el control del original.
- **No:** incluir sonido (`ball-bounce.mp3`/`break-sound.mp3`). Mismo criterio que SPEC 05 (Asteroides): mantiene consistencia de que ningún juego real de la plataforma tiene audio todavía.
- **No:** incluir los botones de salto directo de nivel en la pantalla de pausa del original. Se identifican como herramienta de debug/testing del template, no como mecánica pensada para el jugador final.
- **Sí:** completar el nivel 5 (estado `'win'` del original) se trata exactamente igual que perder las 3 vidas — dispara `onGameOver` y abre el modal de fin de partida existente con el puntaje real, sin mensaje especial de victoria. Simplifica el contrato de componente (no necesita distinguir victoria/derrota) y reutiliza el modal ya existente sin cambios.
- **No:** agregar una variante visual de "victoria" en el modal de fin de partida. Fuera de alcance; el modal actual ya muestra el puntaje final, que es lo relevante para el leaderboard.
- **Sí:** el canvas no dibuja su propio overlay de "GAME OVER"/victoria ni la pantalla de pausa con botones; el HUD externo y el modal existente son la única fuente de verdad visual, igual que en `AsteroidsGame`/`TetrisGame`.
- **Sí:** el reinicio de partida remonta `ArkanoidGame` completo vía la misma `key` (`runId`) que ya usa `GamePlayer` para los otros juegos reales, en vez de exponer un `reset()` imperativo adicional.
- **Sí:** se agrega `"arkanoid"` al arreglo `REAL_GAME_IDS` y se añade una rama más en el renderizado condicional existente de `GamePlayer.tsx`, siguiendo el mismo patrón ya usado al agregar `tetris` sobre `asteroides` (no se introduce un registro/mapa nuevo, porque el patrón actual de array + ternarías ya generalizó la membresía sin necesidad de un registro).

---

## Riesgos

| Riesgo                                                                                                                                                                | Mitigación                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El spritesheet se carga de forma asíncrona (`Image.onload`); si el `useEffect` arranca el loop antes de que cargue, el canvas dibuja en blanco o lanza error          | El loop (`requestAnimationFrame`) solo se arranca dentro del callback de `loadSpritesheet`, igual que hace el template original (`loadSpritesheet(() => { ...; requestAnimationFrame(loop); })`). |
| Los listeners de `mousemove` (canvas) y `keydown`/`keyup` (`window`) quedan activos si el usuario navega fuera de `/juego/arkanoid/jugar` sin desmontar correctamente | El `useEffect` de `ArkanoidGame` remueve todos los listeners y cancela el `requestAnimationFrame` en su función de cleanup, igual que `AsteroidsGame`/`TetrisGame`.                               |
| La conversión de coordenadas de mouse a espacio del canvas (`scaleX`/`rect.left`) puede desalinearse si `.crt-screen` no mantiene exactamente la proporción 4:3       | Se reutiliza el mismo cálculo de escalado del template original y el mismo contenedor `.crt-screen` ya probado por los otros dos juegos reales.                                                   |

---

## Qué **no** incluye esta spec

- Implementación del código (eso es trabajo posterior a esta spec, no cubierto por la skill que la generó).
- Controles táctiles/móviles.
- Sonido/efectos de audio.
- Los botones de salto directo de nivel en la pantalla de pausa.
- Un mensaje visual especial de victoria distinto del flujo normal de fin de partida.
- Persistencia de nivel/vidas entre sesiones (solo el puntaje final).
- Migración de otros juegos mock existentes.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.
