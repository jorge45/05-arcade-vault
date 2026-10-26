# SPEC 05 — Juego real "Asteroides" (primer juego jugable)

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-13
> **Objective:** Portar el juego Asteroides del template standalone (`references/resources/templates/started-games/02-asteroids/game.js`) a un componente React, agregarlo a la Biblioteca como un juego nuevo con id `asteroides`, y conectarlo al Reproductor real (HUD, pausa, fin de partida y guardado de puntaje) en `/juego/asteroides/jugar`.

---

## Scope

**In:**

- Nueva entrada en `GAMES` (`lib/data.ts`) con `id: "asteroides"` (noveno juego de la lista, no reemplaza ni modifica `rocas` ni ningún otro juego existente):
  - `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroides"`.
  - `short`/`long` redactados describiendo la nave triangular, los asteroides que se dividen en fragmentos y el power-up de disparo triple, en el mismo tono que las demás entradas.
  - `best`/`plays` inventados con el mismo estilo que los demás (valores bajos, consistente con ser el juego recién agregado, p.ej. `best: 38500`, `plays: "3.1K"`).
- Nueva clase `.cover-asteroides` en `app/globals.css`, generada en CSS puro siguiendo el mismo patrón que `.cover-bricks`/`.cover-rocas`/etc. (gradiente de fondo + formas decorativas), sin reutilizar ni duplicar `.cover-rocas`.
- Nuevo componente cliente `components/AsteroidsGame.tsx` que porta íntegramente la lógica de `game.js` (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`; constantes `RADII`/`SPEEDS`/`POINTS`/`POWERUP_*`; funciones `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, `update`, `draw`) con estas adaptaciones:
  - Canvas montado vía `useRef`, con todo el estado del juego (nave, asteroides, balas, partículas, power-ups, score, vidas, nivel) encapsulado dentro de un `useEffect` — nada vive en el scope global del módulo.
  - El loop `requestAnimationFrame` se inicia al montar y se cancela en el cleanup del `useEffect`; los listeners `keydown`/`keyup` se agregan a `window` en el mismo efecto y se remueven en el cleanup.
  - Resolución interna del canvas fija en 800×600 (igual al original), dimensionada por CSS a 100% de su contenedor — el `.crt-screen` existente ya tiene `aspect-ratio: 4/3`, que coincide exactamente con 800:600, así que no hay distorsión.
  - Se elimina `drawHUD()` (el canvas ya no dibuja su propio SCORE/NIVEL/vidas) y se elimina el overlay interno de "GAME OVER" (`drawOverlay`); el canvas dibuja únicamente nave, asteroides, balas, partículas y power-ups.
  - Props: `paused: boolean` (si es `true`, el loop sigue llamando a `draw()` pero no a `update()`); `onStats: (stats: { score: number; lives: number; level: number }) => void` (se invoca solo cuando alguno de los tres valores cambia respecto al frame anterior, no en cada frame, para no forzar renders de React a 60fps); `onGameOver: () => void` (se invoca una vez cuando `lives` llega a 0, en vez de mostrar el overlay "GAME OVER" original).
  - Se expone, vía `forwardRef` + `useImperativeHandle`, un método `forceGameOver()` para que el botón "FIN" del HUD externo pueda terminar la partida real en cualquier momento.
  - El reinicio ("JUGAR DE NUEVO" del modal de fin de partida) remonta el componente completo desde `GamePlayer` (usando una `key` que cambia), lo que reinicializa `initGame()` desde cero.
- Modificación de `components/GamePlayer.tsx`: cuando `game.id === "asteroides"`, renderiza `<AsteroidsGame>` dentro de `.crt-screen` en lugar del `.game-arena` decorativo, y:
  - El `player-hud` (Jugador/Puntuación/Vidas/Nivel) refleja los valores reales recibidos vía `onStats` en lugar del ticker simulado.
  - El botón "PAUSA" controla el `paused` real del juego (el overlay "EN PAUSA" ya existente se sigue mostrando igual).
  - El botón "FIN" llama a `forceGameOver()` vía ref; perder las 3 vidas en el juego real dispara `onGameOver`, que activa el mismo modal "FIN DEL JUEGO" ya existente con el puntaje real, reutilizando `saveScore()` sin cambios.
  - El resto de los juegos (`rocas` y los demás mocks) conserva exactamente el comportamiento actual (ticker simulado), sin cambios.
- Controles: idénticos al original (`←`/`→` rotan, `↑` propulsa, `Espacio` dispara). Se agrega, solo para `game.id === "asteroides"`, una línea de ayuda de controles visible en la pantalla del Reproductor (p.ej. junto a `.crt-bottom`), ya que ningún otro juego mock tiene mecánica real que requiera mostrarlo.

**Out of scope (para futuros specs):**

- Controles táctiles / soporte mobile (el juego es solo teclado, igual que el original).
- Sonido / efectos de audio (el template original no los tiene).
- Persistencia de nivel/vidas entre sesiones; solo el puntaje final se persiste, vía `av_scores` ya existente (SPEC 01).
- OVNIs u otros enemigos no presentes en `game.js` (el `README.md` del template no los menciona como implementados).
- Cambios a la pantalla de detalle `/juego/asteroides` más allá de que funcione genéricamente con la nueva entrada de `GAMES` (el leaderboard sigue usando `seededScores` determinístico, igual que los demás juegos).
- Migrar cualquiera de los otros 8 juegos mock a una implementación real (cada uno será su propio spec).
- Tests automatizados.

---

## Data model

No se introduce ningún tipo nuevo en `lib/types.ts`; `Game` y `ScoreRow` ya cubren la nueva entrada. Se agrega únicamente un registro a `GAMES` en `lib/data.ts`:

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "...", // ver scope
  long: "...",  // ver scope
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 38500,
  plays: "3.1K",
}
```

Interfaz de props del nuevo componente (`components/AsteroidsGame.tsx`):

```ts
export interface AsteroidsGameHandle {
  forceGameOver: () => void;
}

export interface AsteroidsGameProps {
  paused: boolean;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: () => void;
}
```

No se persiste ningún estado nuevo en `localStorage`; el puntaje final sigue guardándose en `av_scores` (`SavedScore`, ya definido en SPEC 01) con `game: "asteroides"`.

---

## Implementation plan

1. Agregar la entrada `asteroides` a `GAMES` en `lib/data.ts`.
2. Agregar la clase `.cover-asteroides` en `app/globals.css`, siguiendo el patrón CSS-only de las portadas existentes.
3. Crear `components/AsteroidsGame.tsx` portando `game.js` completo (clases, constantes, `update`/`draw`) dentro de un componente `"use client"` con `forwardRef`, `useRef` para el canvas, y un `useEffect` que inicializa el juego, arranca el loop `requestAnimationFrame`, agrega los listeners de teclado, y limpia todo (cancela el frame, remueve listeners) al desmontar. Quitar `drawHUD()` y el overlay interno de game over; invocar `onStats`/`onGameOver` como se describe en el scope; exponer `forceGameOver()` vía `useImperativeHandle`.
4. Modificar `components/GamePlayer.tsx`: agregar un `ref` a `AsteroidsGame`, estado local para `score`/`lives`/`level` sincronizado vía `onStats` cuando `game.id === "asteroides"`, renderizado condicional del `.crt-screen` (canvas real vs. `.game-arena` mock), wiring de los botones "PAUSA"/"FIN" al juego real, y una `key` que cambia en `restart()` para forzar el remount/reinicio completo de `AsteroidsGame`.
5. Agregar la línea de ayuda de controles de teclado en el Reproductor, solo cuando `game.id === "asteroides"`.
6. Ejecutar `npm run lint` y `npm run build`. Luego, en `npm run dev`, verificar manualmente: la Biblioteca muestra la card "ASTEROIDES"; `/juego/asteroides` muestra el detalle con su leaderboard; `/juego/asteroides/jugar` permite jugar completo (mover/rotar/propulsar, disparar, dividir asteroides, recoger el power-up de disparo triple, perder las 3 vidas, pausar/reanudar, forzar "FIN", guardar el puntaje final, "JUGAR DE NUEVO" reinicia desde cero, "SALIR" vuelve al detalle sin dejar el loop corriendo en segundo plano).

---

## Acceptance criteria

- [ ] `npm run dev` levanta la app sin errores en consola.
- [ ] La Biblioteca (`/`) muestra una card nueva "ASTEROIDES" (categoría SHOOTER) junto a los 8 juegos existentes, sin alterar ninguno de ellos.
- [ ] `/juego/asteroides` muestra el detalle del juego con su leaderboard (`seededScores`), igual que cualquier otro juego.
- [ ] `/juego/asteroides/jugar` muestra el canvas del juego real (nave, asteroides) en lugar del `.game-arena` decorativo.
- [ ] Las flechas izquierda/derecha rotan la nave, la flecha arriba propulsa, y espacio dispara.
- [ ] Destruir un asteroide grande o mediano lo divide en dos fragmentos más pequeños; los pequeños desaparecen sin dividirse, y el puntaje aumenta según el tamaño destruido.
- [ ] Recoger el power-up (ícono "3x") otorga disparo triple temporal.
- [ ] Chocar contra un asteroide sin invencibilidad resta una vida; al llegar a 0 vidas se abre el modal "FIN DEL JUEGO" ya existente, con el puntaje final real.
- [ ] El HUD externo (Jugador/Puntuación/Vidas/Nivel) refleja en tiempo real el score/vidas/nivel reales del juego, no un ticker simulado.
- [ ] El botón "PAUSA" detiene el movimiento/colisiones del juego real; "REANUDAR" lo continúa.
- [ ] El botón "FIN" termina la partida real inmediatamente y abre el modal de fin de partida con el puntaje actual.
- [ ] Guardar el puntaje en el modal lo persiste en `localStorage` (`av_scores`) con `game: "asteroides"`, igual que los demás juegos.
- [ ] "JUGAR DE NUEVO" reinicia el juego desde cero (score 0, 3 vidas, nivel 1, asteroides nuevos).
- [ ] "SALIR" navega de vuelta a `/juego/asteroides` y detiene el loop del juego (no sigue corriendo en segundo plano).
- [ ] Navegar a `/juego/asteroides/jugar`, salir, y volver a entrar inicia una partida nueva y limpia (sin estado ni listeners duplicados de la visita anterior).
- [ ] El resto de los juegos (`rocas`, etc.) siguen comportándose exactamente igual que antes (ticker simulado) en su pantalla de Reproductor.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** el juego se agrega como una entrada nueva en `GAMES` con `id: "asteroides"`, sin tocar `rocas` (que queda como mock, pese a tener temática similar). Decisión explícita del usuario.
- **No:** reemplazar o renombrar `rocas`. Se descarta porque son juegos distintos a ojos del usuario, aunque compartan temática.
- **Sí:** se porta `game.js` a un componente React (`components/AsteroidsGame.tsx`) en vez de embeberlo vía `iframe`. Permite compartir el HUD externo (`player-hud`) y el flujo de guardado de puntaje (`saveScore()`) ya existentes, consistente con cómo SPEC 01 trató los demás mocks (componentes propios en `components/`, no HTML externo).
- **No:** usar un `iframe` apuntando al `index.html`/`game.js` original. Aislaría el juego del contexto de usuario y complicaría sincronizar el HUD y el guardado de puntaje vía `postMessage` sin necesidad.
- **Sí:** el canvas no dibuja su propio HUD (se elimina `drawHUD()` y el overlay de game over del original); el HUD externo (`player-hud`) y el modal de fin de partida ya existentes son la única fuente de verdad visual para score/vidas/nivel/fin de partida. Evita duplicar la información y mantiene consistencia visual con los demás juegos de la plataforma.
- **No:** mantener el HUD dibujado dentro del canvas además del externo. Se descartó por redundante y por desalinearse del resto de la plataforma.
- **Sí:** los botones "PAUSA"/"FIN" del HUD externo controlan el juego real (prop `paused` y método imperativo `forceGameOver()`), en vez de dejarlos sin efecto. Es el comportamiento esperado dado que ya existen en la UI de todos los juegos.
- **Sí:** `onStats` solo se invoca cuando `score`/`lives`/`level` cambian (no en cada frame a 60fps), para evitar re-renders innecesarios de React. Decisión técnica para mantener el rendimiento del loop del juego.
- **Sí:** el reinicio de partida remonta `AsteroidsGame` completo vía `key` desde `GamePlayer`, en vez de exponer un método `reset()` imperativo adicional. Es más simple y garantiza que no quede estado residual de la partida anterior.
- **Sí:** el canvas usa resolución interna fija 800×600 (igual al original), escalada por CSS al 100% de `.crt-screen` (que ya tiene `aspect-ratio: 4/3`, coincidiendo exactamente). Evita reescribir la lógica de coordenadas del juego para un canvas de tamaño dinámico.
- **No:** controles táctiles ni soporte mobile. El juego original es solo teclado; agregarlos sería trabajo adicional no solicitado.
- **No:** sonido/efectos de audio. El template original (`game.js`) no los implementa.
- **Sí:** se crea una clase CSS nueva `.cover-asteroides` en vez de reutilizar `.cover-rocas`, para que la card tenga una portada visualmente distinta a la de "Rocas" pese a la temática similar.

---

## Risks

| Riesgo                                                                                                                                                      | Mitigación                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los listeners de teclado (`keydown`/`keyup` en `window`) quedan activos si el usuario navega fuera de `/juego/asteroides/jugar` sin desmontar correctamente | El `useEffect` de `AsteroidsGame` remueve los listeners y cancela el `requestAnimationFrame` en su función de cleanup, que React ejecuta siempre al desmontar.               |
| Sincronizar `score`/`lives`/`level` hacia React en cada frame degrada el rendimiento del loop del juego                                                     | `onStats` solo se invoca cuando alguno de los tres valores cambia respecto al frame anterior, no en cada tick de 60fps.                                                      |
| El canvas fijo en 800×600 se ve borroso o recortado si `.crt-screen` no mantiene exactamente la proporción 4:3 en algún breakpoint                          | Se usa el mismo contenedor `.crt-screen` ya probado visualmente por los demás juegos mock, que mantiene `aspect-ratio: 4/3` en todos los tamaños de pantalla soportados hoy. |

---

## What is **not** in this spec

- Controles táctiles / mobile.
- Sonido y efectos de audio.
- Persistencia de nivel/vidas entre sesiones (solo el puntaje final).
- Enemigos u OVNIs adicionales no presentes en `game.js`.
- Implementación real de cualquiera de los otros 8 juegos mock.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.
