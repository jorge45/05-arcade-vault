# SPEC 04 — Integración del SDK de Supabase en Next.js

> **Status:** implementado
> **Depends on:** (ninguno)
> **Date:** 2026-10-07
> **Objective:** Instalar y configurar el SDK de Supabase en la app Next.js, conectándola al proyecto ya creado (`pdjjqimjsppwdfalcfgh.supabase.co`), sin implementar todavía auth real, tablas, ni migrar ningún mock existente.

---

## Scope

**In:**

- Instalación de la dependencia `@supabase/supabase-js` en `package.json`.
- Variables de entorno documentadas en `.env.example` (vacías) y configuradas con los valores reales en `.env.local` (no versionado):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave pública moderna `sb_publishable_...`, recomendada por Supabase sobre la legacy `anon` key para proyectos nuevos).
- Un único cliente de Supabase para el browser: `lib/supabase/client.ts`, que exporta una función `createClient()` instanciando `createClient(url, publishableKey)` del SDK, leyendo las variables `NEXT_PUBLIC_*` anteriores.
- Un script de verificación de un solo uso, `scripts/check-supabase.ts`, ejecutado manualmente con `npx tsx scripts/check-supabase.ts` (o equivalente) durante `/spec-impl`, que instancia el cliente y llama a `supabase.auth.getSession()` para confirmar que la app puede alcanzar la API del proyecto sin errores de red/configuración. No se deja ningún endpoint ni ruta nueva en la app.

**Out of scope (para futuros specs):**

- Autenticación real (login/signup con Supabase Auth, OAuth, reemplazo de `Auth.tsx`/`UserProvider`/`av_user`).
- Middleware de sesión (`middleware.ts`, patrón `@supabase/ssr`) — no aplica porque todavía no hay ninguna pantalla conectada a auth real.
- Cliente de servidor para Server Components/Route Handlers (`lib/supabase/server.ts`) — se agrega cuando un spec futuro lo necesite (auth o datos reales).
- Cualquier tabla en la base de datos (juegos, puntajes, perfiles) y cualquier migración de los mocks actuales (`lib/data.ts`, `GAMES`, `seededScores`, `av_scores`).
- Realtime (Supabase Realtime / subscripciones).
- Edge Functions.
- Row Level Security / policies (no hay tablas todavía).
- `scripts/check-supabase.ts` no queda como parte de un pipeline de CI ni se automatiza; es solo para la verificación manual de esta integración.

---

## Data model

No se introduce ningún modelo de datos. Este spec solo agrega configuración (dependencia, variables de entorno, cliente SDK) y un script de verificación manual.

---

## Implementation plan

1. Instalar la dependencia `npm install @supabase/supabase-js`.
2. Agregar a `.env.example` las claves `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` (vacías), debajo de las ya existentes (`RESEND_API_KEY`, `SUPABASE_DB_PASSWORD`).
3. Configurar `.env.local` (no versionado) con los valores reales: `NEXT_PUBLIC_SUPABASE_URL=https://pdjjqimjsppwdfalcfgh.supabase.co` y la clave pública moderna del proyecto.
4. Crear `lib/supabase/client.ts` exportando `createClient()`, que instancia el cliente del SDK leyendo `process.env.NEXT_PUBLIC_SUPABASE_URL` y `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Crear `scripts/check-supabase.ts`: importa `createClient()` de `lib/supabase/client.ts`, llama a `supabase.auth.getSession()`, imprime en consola si la llamada respondió sin error de red/configuración (éxito) o el error (fallo).
6. Ejecutar el script manualmente (`npx tsx scripts/check-supabase.ts`) y confirmar que responde sin error de conexión.
7. Correr `npm run lint` y `npm run build` para confirmar que la nueva dependencia y el cliente no rompen el build.

---

## Acceptance criteria

- [x] `@supabase/supabase-js` aparece como dependencia en `package.json`.
- [x] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores reales.
- [x] `.env.local` tiene los valores reales y no está versionado (ya cubierto por `.gitignore`).
- [x] `lib/supabase/client.ts` exporta `createClient()` y no lanza error al importarse.
- [x] Ejecutar `scripts/check-supabase.ts` confirma la conexión al proyecto de Supabase sin error de red/configuración.
- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] No se agregó ninguna tabla, policy, endpoint, ni pantalla nueva como parte de este spec.

---

## Decisions

- **Sí:** se usa la clave pública moderna (`sb_publishable_...`) en vez de la legacy `anon` (JWT), siguiendo la recomendación actual de Supabase para proyectos nuevos.
- **No:** usar `@supabase/ssr` ni un cliente de servidor todavía. Se descarta porque ese patrón existe para sincronizar sesiones de auth vía cookies, y este spec no implementa auth.
- **Sí:** el spec se limita estrictamente a la integración del SDK (instalación, env vars, cliente browser, verificación manual), por decisión explícita del usuario. Auth, base de datos, realtime y Edge Functions quedan fuera y se cubrirán en specs futuros.
- **Sí:** la verificación de conexión es un script de un solo uso (`scripts/check-supabase.ts`), no un endpoint de la app, para no dejar código productivo nuevo que no tenga uso todavía.
- **No:** migrar `lib/data.ts` (`GAMES`, `seededScores`) o `av_user`/`av_scores` de `localStorage` a Supabase. Se descarta explícitamente para este spec; es trabajo de specs futuros de auth y de datos/puntajes.

---

## What is **not** in this spec

- Autenticación real (Supabase Auth, OAuth, reemplazo del mock de `Auth.tsx`).
- Cliente de servidor (`lib/supabase/server.ts`) y middleware de sesión.
- Tablas, policies (RLS), y migración de los mocks de juegos/puntajes.
- Realtime y Edge Functions (previstos para specs futuros, mencionados por el usuario como dirección a mediano plazo).

Cada uno de estos, si se necesita, va en su propio spec.
