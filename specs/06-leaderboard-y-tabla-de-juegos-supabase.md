# SPEC 06 — Leaderboard y tabla de juegos reales en Supabase

> **Status:** implemented
> **Depends on:** SPEC 04
> **Date:** 2026-10-26
> **Objective:** Crear las tablas `games` y `scores` en Supabase (con RLS), migrar los 9 juegos y la lógica de guardado/lectura de puntajes desde los mocks de `lib/data.ts` y `localStorage` (`av_scores`) hacia la base de datos, y conectar Inicio, Biblioteca, Detalle, Reproductor y Salón de la Fama a estos datos reales.

---

## Scope

**In:**

- Tabla `games` en Supabase: una fila por juego (id, título, descripciones, categoría, portada, color, contador de partidas `plays`). **No** incluye una columna `best`: el mejor puntaje se calcula en vivo desde `scores`.
- Tabla `scores` en Supabase: una fila por partida jugada y guardada (juego, nombre del jugador, puntaje, fecha). Es un historial completo (no un upsert por jugador); el leaderboard de cada juego es un `ORDER BY score DESC LIMIT N` sobre esta tabla.
- RLS habilitado en ambas tablas: `SELECT` público en `games` y `scores`; `INSERT` público únicamente en `scores` (nadie puede insertar/editar/borrar `games` desde el cliente, ni editar/borrar `scores`).
- Migración (vía `apply_migration` del proyecto Supabase ya conectado, `pdjjqimjsppwdfalcfgh.supabase.co`) que crea ambas tablas, sus policies, un índice `(game_id, score desc)` en `scores`, y siembra `games` con los 9 juegos reales actuales de `GAMES` (`lib/data.ts`), sin su campo `best`.
- La tabla `scores` arranca **vacía**: no se migra ni se inventa historial de puntajes; el leaderboard de cada juego se puebla únicamente con partidas reales jugadas después de este spec.
- `lib/supabase/server.ts`: cliente de Supabase para Server Components/Route Handlers (sin `@supabase/ssr`, porque no hay sesión de auth que sincronizar todavía), leyendo las mismas variables `NEXT_PUBLIC_*` ya configuradas en SPEC 04.
- `lib/games.ts`: funciones de lectura server-side (`getGames`, `getGame`, `getLeaderboard`) usadas por las páginas que son Server Components.
- `lib/data.ts` se reduce a exportar únicamente `CATS` (lista de categorías para los chips de filtro); se eliminan `GAMES` y `seededScores`.
- `lib/types.ts`: `Game` deja de tener `best`; se agrega `GameWithBest` (`Game & { best: number | null }`) para las pantallas que lo necesitan; `SavedScore` pierde el campo `at` (la fecha la pone `scores.created_at` en el servidor).
- `lib/user-context.tsx`: `saveScore` pasa a ser `async` e inserta en la tabla `scores` (vía cliente de browser) en vez de escribir en `localStorage`; se elimina toda lectura/escritura de `av_scores`.
- Conectar a los datos reales (`games`/`scores`), reemplazando los mocks:
  - `app/page.tsx` + `components/Home.tsx` (sección "JUEGOS DISPONIBLES AHORA", primeros 6 juegos).
  - `app/biblioteca/page.tsx` + `components/Library.tsx` (grid completo con `best` real por juego).
  - `app/juego/[id]/page.tsx` + `components/GameDetail.tsx` (ficha del juego con `best`/`plays` reales y leaderboard real de ese juego).
  - `app/salon-de-la-fama/page.tsx` + `components/HallOfFame.tsx` (tabs por juego, podio, tabla top 12 y fila "TU MEJOR MARCA", todo con datos reales).
  - `components/GamePlayer.tsx` (ajuste al `saveScore` ahora asíncrono).
- Estados de leaderboard vacío/parcial: cuando un juego tiene menos de 3 puntajes guardados, el podio y la tabla del Salón de la Fama mantienen su layout fijo actual pero muestran un placeholder ("—" / "SIN DATOS") en los puestos sin un puntaje real, en vez de inventar filas. Lo mismo aplica al `best` de un juego sin partidas (se muestra "—" en vez de un número).
- "TU MEJOR MARCA" en el Salón de la Fama se calcula con el mejor puntaje real del usuario logueado (`MAX(score)` en `scores` filtrando por `name = user.name` y el juego seleccionado); si no tiene ninguno para ese juego, la fila no se muestra (igual que hoy se oculta si no hay usuario).

**Out of scope (para futuros specs):**

- Autenticación real (Supabase Auth). Los puntajes siguen identificándose por el campo de texto libre `name` (el mock `av_user.name` o "INVITADO"), igual que hoy — cualquiera puede insertar un puntaje con cualquier nombre.
- Supabase Realtime (actualización en vivo del leaderboard sin recargar).
- Recalcular o mostrar `plays` (contador de partidas) de forma dinámica; se queda como columna estática migrada tal cual.
- Edge Functions.
- Borrado/moderación de puntajes (no hay policy de `DELETE`/`UPDATE` en `scores`; si se necesita, es un spec futuro, probablemente ligado a auth real).
- Migrar/tocar `av_user` (sigue siendo el mock de sesión en `localStorage`, sin cambios).
- Tests automatizados.
- Paginación del leaderboard más allá de los `LIMIT` fijos ya usados hoy (10 en Detalle, 12 en Salón de la Fama).

---

## Data model

```sql
-- supabase/migración aplicada vía apply_migration

create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  plays text not null,
  created_at timestamptz not null default now()
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id) on delete cascade,
  name text not null,
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on scores (game_id, score desc);

alter table games enable row level security;
alter table scores enable row level security;

create policy "games_select_public" on games for select using (true);
create policy "scores_select_public" on scores for select using (true);
create policy "scores_insert_public" on scores for insert with check (true);

-- seed: los 9 juegos reales de GAMES (lib/data.ts), sin el campo `best`
insert into games (id, title, short, long, cat, cover, color, plays) values (...);
```

```ts
// lib/types.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  plays: string;
}

export interface GameWithBest extends Game {
  best: number | null; // MAX(score) real desde `scores`; null si el juego no tiene partidas
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // formateada desde scores.created_at
}

export interface SavedScore {
  game: string; // Game.id, se mapea a scores.game_id
  score: number;
  name: string;
}
```

```ts
// lib/games.ts (server-side, usa lib/supabase/server.ts)
export async function getGames(): Promise<GameWithBest[]>;
export async function getGame(id: string): Promise<GameWithBest | null>;
export async function getLeaderboard(
  gameId: string,
  limit?: number,
): Promise<ScoreRow[]>;
```

`lib/data.ts` queda únicamente con `export const CATS: string[]`.

---

## Implementation plan

1. Aplicar la migración (vía `apply_migration` sobre el proyecto Supabase ya conectado) que crea `games`, `scores`, el índice, las policies de RLS, y siembra `games` con los 9 registros reales de `GAMES` (sin `best`).
2. Actualizar `lib/types.ts`: quitar `best` de `Game`, agregar `GameWithBest`, quitar `at` de `SavedScore`.
3. Crear `lib/supabase/server.ts` exportando `createClient()` para Server Components.
4. Crear `lib/games.ts` con `getGames()`, `getGame(id)`, `getLeaderboard(gameId, limit = 10)`: `getGames`/`getGame` hacen `select` sobre `games` y agregan `best` con una query a `scores` (`MAX(score)` agrupado por `game_id`); `getLeaderboard` hace `select` sobre `scores` filtrado por `game_id`, ordenado por `score desc`, con `limit`, mapeado a `ScoreRow` (rank = índice + 1, date formateada desde `created_at`).
5. Vaciar `lib/data.ts`: eliminar `GAMES` y `seededScores`, dejar solo `CATS`.
6. Actualizar `lib/user-context.tsx`: `saveScore` pasa a `async`, hace `insert` en `scores` (vía `lib/supabase/client.ts`) con `{ game_id: entry.game, name: entry.name, score: entry.score }`; eliminar la lectura/escritura de `av_scores`.
7. Convertir `app/page.tsx` en Server Component `async` que llama `getGames()` y pasa la lista a `<Home games={games} />`; actualizar `components/Home.tsx` para recibir `games: GameWithBest[]` como prop en vez de importar `GAMES`, manteniendo `.slice(0, 6)` para el riel de preview.
8. Convertir `app/biblioteca/page.tsx` en Server Component `async` que llama `getGames()` y pasa la lista a `<Library games={games} />`; actualizar `components/Library.tsx` para recibir `games` como prop (deja de importar `GAMES`), filtrando con `useMemo` sobre la prop; mostrar "—" cuando `game.best === null`.
9. Convertir `app/juego/[id]/page.tsx` en `async`, usando `getGame(id)` (si no existe, `notFound()`) y `getLeaderboard(id, 10)`; actualizar `components/GameDetail.tsx` para tipar `game: GameWithBest`, mostrar "—" si `best === null`, y mostrar un mensaje ("Aún no hay puntajes para este juego — ¡sé el primero!") cuando `scores.length === 0`.
10. Convertir `app/salon-de-la-fama/page.tsx` en `async`, usando `getGames()` para pasar la lista completa a `<HallOfFame games={games} />`; actualizar `components/HallOfFame.tsx` para recibir `games` como prop (deja de importar `GAMES`/`seededScores`) y, en un `useEffect` por cambio de `tab`, consultar vía el cliente de browser (`lib/supabase/client.ts`) el top 12 de `scores` para ese `game_id` y, si hay `user`, su mejor puntaje (`MAX(score)` filtrando por `name`); renderizar placeholders ("—"/"SIN DATOS") en los puestos del podio/tabla sin datos reales, y ocultar la fila "TU MEJOR MARCA" si el usuario no tiene ningún puntaje para ese juego.
11. Actualizar `components/GamePlayer.tsx`: await al llamar `saveScore(...)` antes de `setSaved(true)`, con manejo básico del caso de error (mantener el modal abierto y no marcar como guardado si la inserción falla).
12. Ejecutar `npm run lint` y `npm run build`. Luego, en `npm run dev`, verificar manualmente: Inicio y Biblioteca muestran los 9 juegos reales desde Supabase; el Detalle de un juego sin partidas muestra "—" en mejor puntaje y el mensaje de leaderboard vacío; jugar una partida (p. ej. Asteroides) y guardar el puntaje lo inserta en `scores`; recargar el Detalle y el Salón de la Fama de ese juego muestra el puntaje recién guardado; "TU MEJOR MARCA" aparece solo si el usuario logueado tiene un puntaje para el juego seleccionado.

---

## Acceptance criteria

- [ ] `npm run dev` levanta la app sin errores en consola.
- [ ] Existen las tablas `games` y `scores` en el proyecto Supabase, con RLS habilitado y las policies descritas.
- [ ] `games` contiene los 9 juegos reales (migrados desde `GAMES`), sin columna `best`.
- [ ] `scores` arranca vacía tras la migración.
- [ ] Inicio (`/`) muestra el riel de juegos leyendo desde Supabase (no desde `lib/data.ts`).
- [ ] Biblioteca (`/biblioteca`) muestra el grid de 9 juegos leyendo desde Supabase, con búsqueda y filtro por categoría funcionando sobre esos datos.
- [ ] Un juego sin partidas guardadas muestra "—" en "Mejor global" (Detalle) y en la tarjeta de la Biblioteca.
- [ ] El Detalle de un juego sin puntajes muestra el mensaje de leaderboard vacío en vez de una tabla vacía o inventada.
- [ ] Jugar una partida completa y guardar el puntaje en el modal lo inserta en la tabla `scores` de Supabase (ya no en `localStorage`/`av_scores`).
- [ ] Tras guardar un puntaje, el Detalle de ese juego y el Salón de la Fama (con esa tab seleccionada) muestran el puntaje real al recargar.
- [ ] El Salón de la Fama muestra tabs por los 9 juegos reales; cambiar de tab consulta y muestra el top 12 real de `scores` para ese juego.
- [ ] Un juego con menos de 3 puntajes muestra placeholders ("—"/"SIN DATOS") en los puestos del podio sin datos reales, sin romper el layout.
- [ ] Si el usuario logueado tiene al menos un puntaje guardado para el juego seleccionado, aparece la fila "TU MEJOR MARCA" con su mejor puntaje real; si no tiene ninguno, la fila no aparece.
- [ ] Insertar un puntaje nuevo a través de la Biblioteca pública (clave publicable, sin estar logueado) funciona, consistente con que `scores` permite `INSERT` público sin auth real.
- [ ] `lib/data.ts` ya no exporta `GAMES` ni `seededScores`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** migrar también la UI (Inicio, Biblioteca, Detalle, Reproductor, Salón de la Fama) a leer/escribir contra Supabase en este mismo spec, en vez de solo crear las tablas. Decisión explícita del usuario para no dejar las pantallas desconectadas de los datos reales.
- **Sí:** los puntajes se identifican por nombre de texto libre (`av_user.name` o "INVITADO"), sin auth real. Es el mismo nivel de "seguridad" que el mock actual, solo que ahora en una tabla compartida; auth real queda para un spec futuro que SPEC 04 ya dejó fuera de alcance.
- **No:** bloquear este spec hasta tener Supabase Auth. Se descarta porque el usuario prefiere avanzar con el leaderboard ahora y resolver identidad real más adelante.
- **Sí:** `scores` arranca vacía; no se migra ni inventa historial de puntajes de ejemplo. El leaderboard se puebla solo con partidas reales jugadas después de este spec.
- **No:** generar puntajes de ejemplo para evitar un leaderboard vacío al inicio. Se descarta porque el usuario prefiere datos 100% reales desde el día uno, aunque eso signifique un leaderboard vacío al principio.
- **Sí:** `games.best` no existe como columna; se calcula en vivo (`MAX(score)` sobre `scores`) en `getGames()`/`getGame()`. Evita que `best` quede desincronizado de los puntajes reales.
- **No:** mantener `best` como columna estática en `games`. Se descarta porque dejaría de reflejar los puntajes reales en cuanto alguien jugara.
- **Sí:** `games.plays` se migra como columna estática (valor de marketing actual) y no se recalcula en este spec. No hay forma de contar partidas reales todavía sin agregar tracking adicional no solicitado.
- **Sí:** se crea `lib/supabase/server.ts` para que los Server Components (Inicio, Biblioteca, Detalle, Salón de la Fama) consulten `games`/`scores` sin pasar por el cliente de browser. SPEC 04 lo dejó fuera porque todavía no había ninguna tabla que leer desde el servidor; ahora sí la hay.
- **No:** usar `@supabase/ssr` para el cliente de servidor. Se descarta porque ese paquete existe para sincronizar sesiones de auth vía cookies, y este spec sigue sin auth real.
- **Sí:** el leaderboard es un historial completo de partidas (`ORDER BY score DESC`), no un upsert de "mejor puntaje por jugador". Permite que un jugador aparezca varias veces si jugó varias veces, igual que el comportamiento implícito de `av_scores` hoy.
- **No:** hacer upsert por jugador+juego en `scores`. Se descarta porque complica el insert (necesitaría comparar contra el score existente) sin que el usuario lo haya pedido.
- **Sí:** RLS habilitado con `SELECT` público en ambas tablas e `INSERT` público solo en `scores`. Es el default seguro recomendado por Supabase; sin esto el panel del proyecto marca advertencias de seguridad.
- **Sí:** el Salón de la Fama mantiene su layout fijo (podio de 3, tabla de 12) y usa placeholders para los puestos sin datos reales, en vez de rediseñar el layout para listas cortas. Minimiza el cambio visual fuera de lo pedido.
- **Sí:** "TU MEJOR MARCA" se calcula con `MAX(score)` real filtrando por `name` del usuario logueado, y se oculta si no hay ninguno. Reemplaza el cálculo inventado (`youRank`/`youScore` con fórmulas falsas) por el dato real equivalente más simple sin necesitar auth real (no hay `user_id`, solo `name`).
- **Sí:** las consultas del Salón de la Fama por tab (leaderboard + "tu mejor marca") se hacen client-side con el cliente de browser, porque el cambio de tab es interacción del usuario sin recarga de página; las demás pantallas (Inicio, Biblioteca, Detalle) usan el cliente de servidor porque no tienen ese tipo de interactividad post-carga.

---

## Risks

| Riesgo                                                                                                                                                      | Mitigación                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INSERT` público sin auth real en `scores` permite que cualquiera inserte puntajes falsos o spam (sin rate limiting)                                        | Aceptado explícitamente para este spec, igual de "inseguro" que el mock actual en `localStorage`; se resuelve en un spec futuro de auth real si se vuelve un problema.  |
| El leaderboard arranca vacío en producción, lo que puede verse "muerto" al lanzamiento                                                                      | Se maneja con estados vacíos explícitos (mensajes "aún no hay puntajes") en vez de ocultar o romper el layout; se puebla naturalmente con las primeras partidas reales. |
| Calcular `best` con una query agregada adicional (`MAX(score)` por juego) en cada carga de Inicio/Biblioteca puede ser más lento que leer un campo estático | Se usa un índice `(game_id, score desc)` en `scores`; el volumen esperado inicial es bajo y no justifica cachear o desnormalizar en este spec.                          |
| Las consultas client-side del Salón de la Fama (por tab) exponen la URL/clave publicable de Supabase en el bundle del navegador                             | Es la misma clave pública (`sb_publishable_...`) ya expuesta desde SPEC 04 vía `NEXT_PUBLIC_*`; las policies de RLS son la barrera real, no la ofuscación de la clave.  |

---

## What is **not** in this spec

- Autenticación real (Supabase Auth, identificación de jugadores más allá de un nombre de texto libre).
- Supabase Realtime.
- Recalcular `plays` dinámicamente.
- Edge Functions.
- Borrado/moderación de puntajes.
- Migrar o cambiar `av_user`.
- Tests automatizados.
- Paginación del leaderboard más allá de los límites fijos actuales.

Cada uno de estos, si se necesita, va en su propio spec.
