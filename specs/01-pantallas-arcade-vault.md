# SPEC 01 — Pantallas visuales del MVP de Arcade Vault

> **Status:** Approved
> **Depends on:** (ninguno)
> **Date:** 2026-09-17
> **Objective:** Portar las 5 pantallas del prototipo estático (`references/resources/templates/`) a rutas reales de Next.js 16 App Router, solo con maquetación visual y datos simulados, sin implementar ninguna mecánica de juego real.

---

## Scope

**In:**

- 5 rutas nuevas: `/` (Biblioteca), `/juego/[id]` (Detalle), `/juego/[id]/jugar` (Reproductor), `/iniciar-sesion` (Auth), `/salon-de-la-fama` (Salón de la Fama).
- `Nav` compartido (desktop + panel móvil con hamburguesa), montado en `app/layout.tsx`.
- Estado de sesión de usuario (mock) compartido entre rutas vía contexto de React, persistido en `localStorage` bajo la clave `av_user`.
- Puntajes guardados desde el Reproductor persistidos en `localStorage` bajo la clave `av_scores`.
- Datos de juegos y leaderboards simulados (hardcodeados / generados con semilla determinística), igual que en el prototipo.
- Reproductor con mockup animado: puntaje que sube solo (intervalo falso), HUD, pantalla CRT decorativa, pausa, fin de partida y modal para guardar puntaje.
- Auth mock: tabs "Iniciar sesión" / "Crear cuenta", botón "Jugar como invitado", botones sociales decorativos (no funcionales).
- Reutilización del CSS ya portado en `app/globals.css` y las fuentes ya configuradas en `app/layout.tsx` (Press Start 2P, JetBrains Mono, Courier Prime) y los divs decorativos `av-bg`/`av-noise`.

**Out of scope (para futuros specs):**

- Implementación real de cualquiera de los 8 juegos (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Backend real: base de datos, API, autenticación OAuth/Google/GitHub, sesiones de servidor.
- Leaderboards y puntajes compartidos entre usuarios/dispositivos (solo `localStorage` del navegador local).
- Validaciones reales de credenciales (formato de email, fuerza de contraseña, recuperación de contraseña).
- Tests automatizados.
- Internacionalización / cambio de idioma.
- Nuevos juegos o categorías no presentes en el prototipo.

---

## Data model

```ts
// lib/types.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS del fondo, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface User {
  name: string;
}

export interface SavedScore {
  game: string; // Game.id
  score: number;
  name: string;
  at: number; // Date.now()
}
```

`lib/data.ts` exporta `GAMES: Game[]` (los 8 juegos del prototipo, portados verbatim), `CATS: string[]` y `seededScores(seed: number, count?: number): ScoreRow[]` (misma función determinística del prototipo).

Claves de `localStorage` (idénticas al prototipo, se conservan tal cual):

- `av_user`: `User | null`.
- `av_scores`: `SavedScore[]`.

---

## Implementation plan

1. Crear `lib/types.ts` y `lib/data.ts` con los tipos y los mocks (`GAMES`, `CATS`, `seededScores`) portados desde `data.jsx`. El proyecto sigue compilando (`npm run build`), aunque nada los consuma todavía.
2. Crear `lib/user-context.tsx` (`"use client"`): `UserProvider` que mantiene `user: User | null` inicializado en `null` y lo sincroniza con `localStorage` (`av_user`) solo dentro de un `useEffect` post-montaje (evita mismatch de hidratación); expone `useUser()` con `{ user, login, signOut, saveScore }`, donde `saveScore` escribe en `av_scores`.
3. Envolver `{children}` en `app/layout.tsx` con `<UserProvider>`. La home actual sigue renderizando sin cambios visibles todavía.
4. Crear `components/Nav.tsx` portando `nav.jsx`: usa `next/link` y `usePathname()` para resaltar el link activo, `useUser()` para mostrar "Iniciar Sesión" o el nombre del usuario, y estado local para abrir/cerrar el panel móvil. Renderizar `<Nav />` en `app/layout.tsx` antes de `{children}`.
5. Crear `components/Library.tsx` (porta `biblioteca.jsx`, incluye `GameCard` con el efecto tilt) y reemplazar `app/page.tsx` para que renderice `<Library />`. Cada card enlaza con `next/link` a `/juego/[id]`.
6. Crear `components/GameDetail.tsx` (porta `detalle.jsx`) y `app/juego/[id]/page.tsx`, que busca el juego por `params.id` en `GAMES` (usa `notFound()` si no existe) y le pasa el juego y el leaderboard (`seededScores`) al componente. Los botones enlazan a `/juego/[id]/jugar` y a `/`.
7. Crear `components/GamePlayer.tsx` (porta `reproductor.jsx`, `"use client"`) y `app/juego/[id]/jugar/page.tsx`. Conserva el intervalo falso de puntaje, pausa, fin de partida y el modal de guardar puntaje, que llama a `saveScore()` de `useUser()`. "SALIR" enlaza de vuelta a `/juego/[id]`.
8. Crear `components/Auth.tsx` (porta `auth.jsx`, `"use client"`) y `app/iniciar-sesion/page.tsx`. El submit llama a `login()` de `useUser()` y redirige a `/` con `useRouter().push`. "Jugar como invitado" también inicia sesión (o limpia el usuario) y redirige.
9. Crear `components/HallOfFame.tsx` (porta `salon.jsx`, `"use client"`) y `app/salon-de-la-fama/page.tsx`. Las tabs de juego son estado local; la fila "TU MEJOR MARCA" solo se muestra si `useUser().user` existe.
10. Eliminar el contenido boilerplate de Next.js/Vercel que ya no se usa, correr `npm run lint` y `npm run build`, y navegar manualmente las 5 pantallas en `npm run dev` para verificar el flujo completo.

---

## Acceptance criteria

- [ ] `npm run dev` levanta la app sin errores en consola.
- [ ] La ruta `/` muestra la Biblioteca con buscador, chips de categoría y grid de 8 juegos.
- [ ] Buscar por texto y filtrar por categoría actualiza el grid sin recargar la página.
- [ ] Click en una card navega a `/juego/<id>` y muestra la info correcta de ese juego junto con su leaderboard.
- [ ] El botón "JUGAR AHORA" navega a `/juego/<id>/jugar` y muestra el HUD, la pantalla CRT y el puntaje incrementando solo.
- [ ] Pausar detiene el incremento del puntaje; reanudar lo continúa.
- [ ] El botón "FIN" abre el modal de fin de partida con el puntaje final.
- [ ] Guardar el puntaje en el modal lo persiste en `localStorage` (`av_scores`) y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] `/iniciar-sesion` permite alternar entre "Iniciar sesión" y "Crear cuenta"; enviar el formulario guarda el usuario en `localStorage` (`av_user`) y redirige a `/`.
- [ ] "Jugar como invitado" también redirige a `/` sin pedir credenciales.
- [ ] Tras iniciar sesión, el Nav muestra el nombre de usuario en vez del botón "Iniciar Sesión", en cualquier ruta.
- [ ] Cerrar sesión desde el Nav limpia `av_user` y vuelve a mostrar "Iniciar Sesión".
- [ ] `/salon-de-la-fama` muestra tabs por juego, podio top 3 y tabla de 12 posiciones para el juego seleccionado.
- [ ] Si hay un usuario logueado, `/salon-de-la-fama` muestra la fila "TU MEJOR MARCA"; si no hay usuario, esa fila no aparece.
- [ ] El menú móvil (hamburguesa) abre y cierra el panel lateral en pantallas angostas.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** rutas reales de Next.js App Router en vez de hash routing. Es lo idiomático en Next 16 y habilita deep-linking y botón "atrás" del navegador sin esfuerzo extra.
- **No:** mantener el enrutador manual basado en `location.hash` del prototipo. Reinventaría el router de Next sin necesidad.
- **Sí:** mockup animado en el Reproductor (score ticker + decorativos). Mantiene la fidelidad visual del prototipo sin implementar ninguna mecánica de juego real.
- **No:** pantalla de Reproductor 100% estática. Se vería "muerta" y no reflejaría el diseño original.
- **Sí:** Auth 100% mock en `localStorage`, sin backend. Es el mismo comportamiento del prototipo y coincide con "solo la parte visual".
- **No:** agregar validaciones reales de email/contraseña. No hay backend contra el cual validar; agregarlas simularía una seguridad inexistente.
- **Sí:** datos y leaderboards simulados (`GAMES` hardcodeado, `seededScores` determinístico), igual que el prototipo.
- **No:** conectar una base de datos real para juegos o puntajes. Fuera de alcance de este MVP visual.
- **Sí:** estado de usuario compartido vía contexto de React en un client component raíz (`UserProvider`), para que el Nav y las páginas se mantengan sincronizados sin recargar la página.
- **No:** que cada pantalla lea `localStorage` por su cuenta. Podría desincronizar el Nav tras iniciar/cerrar sesión.
- **Sí:** segmentos de URL en español (`/juego/[id]`, `/salon-de-la-fama`, `/iniciar-sesion`), consistente con el idioma de la interfaz.
- **Sí:** componentes de pantalla en `components/` y mocks/tipos en `lib/`, dejando cada `app/*/page.tsx` delgado.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (modo privado del navegador) | La app sigue funcionando en memoria durante la sesión; solo no persiste `av_user`/`av_scores` entre recargas, igual que en el prototipo original. |
| Mismatch de hidratación de Next.js al leer `localStorage` en el primer render | `UserProvider` inicializa `user` en `null` durante SSR y lo actualiza solo dentro de un `useEffect` tras montar en el cliente. |

---

## What is **not** in this spec

- Implementación real de cualquiera de los 8 juegos.
- Backend, base de datos o autenticación real (OAuth, sesiones de servidor).
- Leaderboards o puntajes sincronizados entre dispositivos/usuarios.
- Validaciones reales de credenciales o recuperación de contraseña.
- Tests automatizados.
- Internacionalización.

Cada uno de estos, si se necesita, va en su propio spec.
