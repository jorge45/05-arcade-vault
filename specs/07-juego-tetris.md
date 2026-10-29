# SPEC 07 — Juego real "Tetris"

> **Estado:** Implementado · **Depende de:** SPEC 05, SPEC 06 · **Fecha:** 2026-10-29
> **Objetivo:** Portar el juego Tetris del template standalone (`~/Desktop/started-games/03-tetris/game.js`) a un componente React, agregarlo a la Biblioteca como juego nuevo con id `tetris`, y conectarlo al Reproductor real (HUD, pausa, fin de partida y guardado de puntaje) en `/juego/tetris/jugar`.

---

## Alcance

**Incluye:**

- Nueva entrada en `games` (Supabase) con `id: "tetris"`, `title: "TETRIS"`, `cat: "PUZZLE"`, `color: "yellow"`, `cover: "cover-tetris"`, `plays: "0"` (sin `best`, se calcula en vivo desde `scores`, igual que los demás juegos desde SPEC 06).
- Nueva clase `.cover-tetris` en `app/globals.css`, CSS puro, siguiendo el patrón de `.cover-asteroides`/`.cover-rocas`.
- Nuevo componente cliente `components/TetrisGame.tsx` que porta íntegramente la lógica de `game.js` (tablero `ROWS×COLS`, las 8 piezas incluyendo la pieza extra "N" tipo tuerca, rotación con wall kicks, soft/hard drop, ghost piece, limpieza de líneas, puntuación `LINE_SCORES × nivel`, niveles cada 10 líneas) con estas adaptaciones:
  - Todo el estado del juego (tablero, pieza actual, siguiente pieza, score, líneas, nivel, pausa, game over) encapsulado dentro de un `useEffect`, sin estado en el scope global del módulo.
  - El loop `requestAnimationFrame` se inicia al montar y se cancela en el cleanup; los listeners de teclado se agregan a `window` en el mismo efecto y se remueven en el cleanup.
  - El componente renderiza tablero + panel lateral (NEXT, contador de LÍNEAS, botón de toggle de tema claro/oscuro) como un bloque único dentro de `.crt-screen`; se ajusta la proporción de `.crt-screen` (o una variante condicional) para este layout en vez del 4:3 fijo usado por Asteroides.
  - El toggle de tema claro/oscuro del template se mantiene, pero su alcance se limita a los colores internos del tablero/piezas/panel dentro del canvas de Tetris; no afecta el CRT, el HUD externo ni ninguna otra pantalla de Arcade Vault. Se persiste en `localStorage` bajo una clave propia (p.ej. `tetris-theme`), igual que en el template.
  - Se elimina la tecla `P` de pausa interna y el overlay interno de PAUSA/GAME OVER con su botón "Reiniciar"; el `paused` externo (prop) y el botón "FIN" externo (vía `forceGameOver()`) son la única vía de pausa/fin de partida, igual que en Asteroides.
  - Props: `paused: boolean`; `onStats: (stats: { score: number; lives: number; level: number }) => void` (`lives` se reporta fijo en `1` mientras el juego está activo, y pasa a `0` en el instante del game over; `level` es el nivel real de Tetris); `onGameOver: () => void` (se invoca una vez cuando una pieza nueva colisiona al aparecer, en vez de mostrar el overlay "GAME OVER" original). El contador de líneas (`lines`) no se expone vía `onStats` — se muestra únicamente dentro del panel lateral del propio canvas.
  - Se expone, vía `forwardRef` + `useImperativeHandle`, un método `forceGameOver()` para que el botón "FIN" del HUD externo pueda terminar la partida real en cualquier momento.
  - El reinicio ("JUGAR DE NUEVO" del modal de fin de partida) remonta el componente completo desde `GamePlayer` (usando una `key` que cambia), igual que Asteroides.
- Modificación de `components/GamePlayer.tsx`: registrar `tetris` como segundo juego real (generalizando o extendiendo el switch/registro usado para `isAsteroides`, dejando la forma final —registro vs. `if/else` adicional— como decisión del trabajo de implementación), renderizar `<TetrisGame>` dentro de `.crt-screen` con el ajuste de proporción necesario, conectar el `player-hud` (Jugador/Puntuación/Vidas/Nivel) a los valores reales vía `onStats`, y wirear los botones "PAUSA"/"FIN" al juego real.
- Controles: `←`/`→` mueven, `↑` o `X` rotan, `↓` hace soft drop, `Espacio` hace hard drop (igual que el template). Se agrega una línea de ayuda de controles visible en la pantalla del Reproductor, solo para `game.id === "tetris"`, análoga a la que ya existe para Asteroides.

**Fuera de alcance (para futuros specs):**

- Implementación del código (eso es trabajo posterior a esta spec, no cubierto por la skill que la generó).
- Controles táctiles / soporte mobile.
- Sonido / efectos de audio (el template no los tiene).
- Que el toggle de tema de Tetris afecte el resto de la UI de Arcade Vault (CRT, HUD externo, otras pantallas).
- Mostrar el contador de líneas (`lines`) en el HUD externo (`player-hud`); queda solo dentro del canvas.
- Persistencia de nivel/líneas/tablero entre sesiones; solo el puntaje final se persiste en `scores`.
- Migrar cualquiera de los otros juegos mock restantes a una implementación real (cada uno es su propio spec).
- Tests automatizados.

---

## Modelo de datos

No se crean tablas nuevas; se reutilizan `games`/`scores` de SPEC 06. Se inserta una fila nueva en `games` con `id=tetris`.

```ts
// Fila nueva en la tabla games (sin columna `best`, se calcula en vivo desde `scores`)
{
  id: "tetris",
  title: "TETRIS",
  short: "...", // ver scope
  long: "...",  // ver scope
  cat: "PUZZLE",
  cover: "cover-tetris",
  color: "yellow",
  plays: "0",
}

// Contrato del componente del juego (análogo a AsteroidsGameProps/AsteroidsGameHandle
// en components/AsteroidsGame.tsx:5-13)
export interface TetrisGameHandle {
  forceGameOver: () => void;
}

export interface TetrisGameProps {
  paused: boolean;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: () => void;
}
```

Notas sobre el contrato:

- `lives` en `onStats` no refleja vidas reales de Tetris (no existen); se reporta `1` mientras el juego está activo y `0` en el instante del game over, para reutilizar el HUD externo y el modal de fin de partida existentes sin cambios en su forma.
- `level` sí es el nivel real de Tetris (`Math.floor(lines / 10) + 1`).
- El contador de líneas (`lines`) y el estado del toggle de tema (`tetris-theme` en `localStorage`) son estado interno de `TetrisGame.tsx`, no forman parte del contrato de props ni se persisten en Supabase.
- No se persiste ningún estado nuevo del juego en `localStorage` salvo la preferencia de tema (`tetris-theme`); el puntaje final sigue guardándose en `scores` (`SavedScore`, SPEC 06) con `game_id: "tetris"`.

---

## Plan de implementación

1. Agregar la entrada `tetris` a la tabla `games` en Supabase (vía `apply_migration` o `execute_sql` sobre el proyecto ya conectado), con los valores definidos en "Modelo de datos".
2. Agregar la clase `.cover-tetris` en `app/globals.css`, siguiendo el patrón CSS-only de las portadas existentes.
3. Crear `components/TetrisGame.tsx` portando `game.js` completo (tablero, las 8 piezas, rotación con wall kicks, soft/hard drop, ghost piece, limpieza de líneas, puntuación, niveles, toggle de tema) dentro de un componente `"use client"` con `forwardRef`, `useRef` para los canvas (tablero y NEXT), y un `useEffect` que inicializa el juego, arranca el loop `requestAnimationFrame`, agrega los listeners de teclado, y limpia todo al desmontar. Quitar la tecla `P` y el overlay interno de PAUSA/GAME OVER con su botón "Reiniciar"; invocar `onStats`/`onGameOver` como se describe en el alcance; exponer `forceGameOver()` vía `useImperativeHandle`. Incluir el panel lateral (NEXT, LÍNEAS, toggle de tema) como parte del mismo componente.
4. Modificar `components/GamePlayer.tsx`: registrar `tetris` como segundo juego real (generalizando el registro de juegos reales en vez de encadenar otro `if/else`, o agregando uno si se decide dejarlo para después — decisión del trabajo de implementación), agregar un `ref` a `TetrisGame`, estado local para `score`/`lives`/`level` sincronizado vía `onStats`, ajustar `.crt-screen` (o una variante condicional) para el layout tablero+panel de Tetris, y wirear los botones "PAUSA"/"FIN" al juego real con la `key` que fuerza el reinicio completo.
5. Agregar la línea de ayuda de controles de teclado en el Reproductor, solo cuando `game.id === "tetris"`.
6. Ejecutar `npm run lint` y `npm run build`. Luego, en `npm run dev`, verificar manualmente: la Biblioteca muestra la card "TETRIS"; `/juego/tetris` muestra el detalle con su leaderboard; `/juego/tetris/jugar` permite jugar completo (mover/rotar/soft drop/hard drop, limpiar líneas, subir de nivel, cambiar el tema del canvas, perder al colisionar una pieza nueva, pausar/reanudar vía HUD externo, forzar "FIN", guardar el puntaje final, "JUGAR DE NUEVO" reinicia desde cero, "SALIR" vuelve al detalle sin dejar el loop corriendo en segundo plano).

---

## Criterios de aceptación

- [x] `npm run dev` levanta la app sin errores en consola.
- [x] La Biblioteca (`/`) muestra una card nueva "TETRIS" (categoría PUZZLE, color amarillo) junto a los juegos existentes, sin alterar ninguno de ellos.
- [x] `/juego/tetris` muestra el detalle del juego con su leaderboard real (vacío al inicio, igual que todo juego nuevo desde SPEC 06).
- [x] `/juego/tetris/jugar` muestra el canvas del juego real (tablero, pieza actual, panel NEXT/LÍNEAS) en lugar del `.game-arena` decorativo.
- [x] Las flechas izquierda/derecha mueven la pieza, `↑`/`X` rotan, `↓` hace soft drop, `Espacio` hace hard drop.
- [x] Completar una fila suma puntos según `LINE_SCORES × nivel` y la elimina del tablero.
- [x] El nivel sube cada 10 líneas eliminadas y la velocidad de caída aumenta en consecuencia.
- [x] El botón de toggle de tema cambia los colores del tablero/piezas/panel dentro del canvas, sin afectar el CRT ni el HUD externo.
- [x] Cuando una pieza nueva colisiona al aparecer, se abre el modal "FIN DEL JUEGO" ya existente con el puntaje final real.
- [x] El HUD externo (Jugador/Puntuación/Vidas/Nivel) refleja en tiempo real el score/nivel reales del juego; "Vidas" muestra `1` mientras el juego está activo y `0` al game over.
- [x] El botón "PAUSA" del HUD externo detiene el loop del juego real; "REANUDAR" lo continúa. La tecla `P` ya no tiene efecto propio dentro del canvas.
- [x] El botón "FIN" termina la partida real inmediatamente y abre el modal de fin de partida con el puntaje actual.
- [x] Guardar el puntaje en el modal lo inserta en `scores` con `game_id: "tetris"`.
- [x] "JUGAR DE NUEVO" reinicia el juego desde cero (score 0, nivel 1, tablero vacío, nueva pieza).
- [x] "SALIR" navega de vuelta a `/juego/tetris` y detiene el loop del juego (no sigue corriendo en segundo plano).
- [x] El resto de los juegos (`asteroides`, `rocas`, etc.) siguen comportándose exactamente igual que antes.
- [x] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisiones

- **Sí:** se mantienen las 8 piezas del template, incluyendo la pieza "N" extra tipo tuerca (no estándar en Tetris clásico). Decisión explícita del usuario para portar el template tal cual.
- **No:** recortar a las 7 piezas clásicas. Se descarta porque el usuario prefiere portar el template íntegro.
- **Sí:** se mantiene el toggle de tema claro/oscuro del template, pero acotado a los colores internos del canvas de Tetris (tablero/piezas/panel), sin tocar el CRT ni el HUD externo. Decisión explícita del usuario para conservar esa funcionalidad extra sin que choque con el resto de la UI de Arcade Vault.
- **No:** extender el toggle para cambiar el tema de toda la pantalla del Reproductor. Se descarta porque Arcade Vault ya tiene su propio tema visual (CRT) y mezclar ambos sistemas de tema no se pidió.
- **Sí:** `lives` en `onStats` se reporta fijo en `1` (y `0` al game over) para reutilizar el HUD externo y el modal de fin de partida existentes sin modificar su forma, aunque Tetris no tenga vidas reales. Es el ajuste más simple que preserva el contrato ya probado en Asteroides.
- **No:** rediseñar el `player-hud` para quitarle el campo "Vidas" en el caso de Tetris. Se descarta porque complicaría el componente sin necesidad, dado que el ajuste semántico de "siempre 1" ya resuelve el caso.
- **Sí:** el contador de líneas (`lines`) se muestra solo dentro del panel lateral del canvas, no en el HUD externo. El contrato `onStats` de Asteroides no contempla un cuarto valor, y agregarlo ahí rompería ese contrato ya usado; mostrarlo dentro del juego es más simple.
- **No:** agregar un campo `lines` al contrato `onStats`. Se descarta para no romper el contrato ya establecido en SPEC 05 ni complicar el HUD externo con un campo que no todos los juegos tendrán.
- **Sí:** se elimina la tecla `P` de pausa interna y el overlay interno de PAUSA/GAME OVER con su botón "Reiniciar"; solo el `paused` externo y el botón "FIN"/"JUGAR DE NUEVO" externos controlan el ciclo de vida de la partida. Mismo patrón que Asteroides, evita estados de pausa duplicados o desincronizados.
- **No:** mantener la tecla `P` y el overlay interno junto con los controles externos. Se descarta por el riesgo de inconsistencia entre ambos mecanismos de pausa.
- **Sí:** el layout de Tetris (tablero + panel lateral) vive completo dentro de `.crt-screen`, ajustando su proporción específicamente para este juego, en vez de repartir el panel lateral en el `player-hud` externo. Mantiene todo lo específico del juego encapsulado en su propio componente, igual que Asteroides encapsula su HUD interno (aunque Asteroides no dibuja ninguno).
- **No:** mover NEXT/LÍNEAS/toggle de tema al `player-hud` externo. Se descarta porque ese panel está diseñado para datos genéricos de cualquier juego (Jugador/Puntuación/Vidas/Nivel), no para controles específicos de Tetris.
- **Sí:** categoría `PUZZLE` y color `yellow` para la card nueva. Es la clasificación natural de Tetris y un color no usado aún por Asteroides (`cyan`).
- **Sí:** `plays: "0"` como valor inicial, sin inventar una cifra de marketing. Consistente con que `scores` arranca vacía desde SPEC 06 y evita datos inventados.
- **No:** inventar un número de marketing para `plays` (como se hizo para `best` antes de SPEC 06). Se descarta porque el usuario prefiere el valor real/neutral ahora que la plataforma ya tiene datos reales.

---

## Riesgos

| Riesgo                                                                                                                                                         | Mitigación                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El toggle de tema interno del canvas podría filtrarse visualmente fuera de `.crt-screen` (colores que no contrastan con el marco CRT)                          | El toggle solo cambia variables CSS/colores dentro del propio `TetrisGame.tsx`; se prueba manualmente en ambos estados dentro de `.crt-screen` antes de cerrar la implementación. |
| Ajustar la proporción de `.crt-screen` para el layout tablero+panel de Tetris podría romper visualmente la pantalla de Asteroides (que depende del 4:3 actual) | El ajuste se aplica condicionalmente solo cuando `game.id === "tetris"` (análogo a cómo ya se condiciona qué componente renderizar), dejando el 4:3 de Asteroides intacto.        |
| Reportar `lives` fijo en `1`/`0` en vez de un valor real podría confundir si en el futuro se agrega soporte de múltiples "continues" a Tetris                  | Aceptado explícitamente para esta spec; si se necesita un concepto real de vidas en Tetris, es una spec futura que reconsideraría el contrato.                                    |
| Los listeners de teclado (`keydown` en `window`) quedan activos si el usuario navega fuera de `/juego/tetris/jugar` sin desmontar correctamente                | El `useEffect` de `TetrisGame` remueve los listeners y cancela el `requestAnimationFrame` en su cleanup, igual que en `AsteroidsGame.tsx`.                                        |

---

## Qué **no** incluye esta spec

- Implementación del código (eso es trabajo posterior a esta spec, no cubierto por la skill que la generó).
- Controles táctiles/móviles.
- Sonido/audio.
- Que el toggle de tema de Tetris afecte el resto de la UI de Arcade Vault.
- El contador de líneas en el HUD externo.
- Migración de los demás juegos mock restantes.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.
