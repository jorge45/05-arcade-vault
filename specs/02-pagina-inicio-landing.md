# SPEC 02 — Página de inicio (landing) de Arcade Vault

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-24
> **Objective:** Portar la landing page del prototipo (`references/resources/templates/home-about/home.jsx`) como la nueva ruta `/`, moviendo la Biblioteca actual a `/biblioteca` y actualizando todos los enlaces internos afectados, sin incluir la pantalla "Acerca de" del mismo template.

---

## Scope

**In:**

- Nueva ruta `/` que renderiza la landing (`Home`): hero con eslogan y CTAs, silutetas flotantes decorativas, sección "¿Por qué Arcade Vault?" (feature grid), preview de 6 juegos (`GAMES.slice(0, 6)`), sección de stats, sección de actividad en vivo (últimas puntuaciones + top jugadores del día), sección de precios (plan único gratis + FAQ), CTA final.
- La Biblioteca actual (spec 01) se mueve de `/` a `/biblioteca`, sin cambios de comportamiento propios.
- Actualización de `components/Nav.tsx`: se agrega el link "Inicio" (`/`) junto a "Biblioteca" (`/biblioteca`) en el menú desktop y en el panel móvil; el resaltado de link activo (`isActive`) se ajusta a las nuevas rutas.
- Actualización de enlaces internos afectados por el movimiento de la Biblioteca (ver sección de decisiones para el detalle ruta por ruta).
- Porte a `app/globals.css` de las clases CSS del template que aún no existen (`home`, `home-hero*`, `hero-*`, `home-silos` y sus variantes `.s1`–`.s8`, `home-section`, `feature-grid`, `feature-card*`, `ft-*`, `mini-rail`, `mini-card`, `mini-cover`, `mini-meta`, `mini-title`, `mini-cat`, `home-stats*`, `stat-block`, `stat-n`, `stat-u`, `stat-s`, `activity-grid`, `activity-card`, `ac-*`, `ticker`, `tick-row`, `tk-*`, `top-list`, `top-row*`, `tp-*`, `pricing-grid`, `price-card`, `pc-*`, `pricing-faq`, `faq-*`, `home-final`, `final-*`, `reveal`/`reveal.in`, animaciones `float`/`bounce` si no existen ya).
- Efecto de aparición al hacer scroll (`useReveal`, `IntersectionObserver` sobre `.reveal`), portado tal cual del prototipo.
- Los 3 bloques de datos hardcodeados del prototipo (`features`, `últimas puntuaciones`, `top jugadores`, `stats`) se portan literalmente dentro del componente `Home`, igual que en `home.jsx`. El preview de juegos reutiliza `GAMES` de `lib/data.ts` (ya existente).
- Todos los CTAs de la landing navegan con `next/link`/`useRouter` a rutas reales: "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" → `/biblioteca`; "CREAR CUENTA" y "EMPEZAR GRATIS →" → `/iniciar-sesion`; "VER SALÓN →" → `/salon-de-la-fama`; cada mini-card de juego → `/juego/[id]`.

**Out of scope (para futuros specs):**

- La pantalla "Acerca de" (`about.jsx`) del mismo template — se deja explícitamente fuera, no se crea ninguna ruta `/acerca-de` ni componente `About`.
- Cualquier dato real de actividad/ranking (los números de la sección "Actividad en Vivo" siguen siendo estáticos, igual que en el prototipo).
- Cambios a la mecánica de los 8 juegos, autenticación real, o cualquier otro tema ya declarado fuera de alcance en SPEC 01.
- Nuevas secciones o contenido que no exista ya en `home.jsx`.

---

## Data model

No se introduce ningún modelo de datos nuevo. La landing reutiliza `GAMES` de `lib/data.ts` (ya existente, de SPEC 01) para la sección de preview de juegos. El resto del contenido (features, actividad reciente, top jugadores, stats) son arrays literales definidos dentro de `components/Home.tsx`, igual que están hardcodeados en `home.jsx`, sin persistencia ni tipos nuevos.

---

## Implementation plan

1. Mover la Biblioteca: crear `app/biblioteca/page.tsx` con el mismo contenido que el actual `app/page.tsx` (renderiza `<Library />`). El proyecto sigue compilando con dos rutas mostrando la Biblioteca temporalmente.
2. Añadir a `app/globals.css` las clases listadas en el scope, portadas literalmente desde `references/resources/templates/home-about/styles.css` (incluye keyframes `float`/`bounce` si no existen ya en el archivo).
3. Crear `components/Home.tsx` (`"use client"`, porque usa `useEffect`/`IntersectionObserver` para `useReveal`) portando `home.jsx`: `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` y el componente `Home`. Reemplazar las llamadas `navigate({ name: ... })` por `next/link` (`<Link href="...">`) o `useRouter().push(...)` según corresponda a cada CTA (ver mapeo de rutas en el scope). El preview de juegos usa `GAMES` importado de `lib/data.ts`.
4. Reemplazar `app/page.tsx` para que renderice `<Home />` en vez de `<Library />`.
5. Actualizar `components/Nav.tsx`: agregar el link "Inicio" → `/` (desktop y móvil), cambiar el link "Biblioteca" para apuntar a `/biblioteca`, y ajustar la lógica de resaltado (`isActive`) para que "Inicio" esté activo solo en `/` exacto y "Biblioteca" esté activo en `/biblioteca` y en `/juego/*`. El logo sigue enlazando a `/`.
6. Actualizar los enlaces que hoy apuntan a `/` esperando la Biblioteca:
   - `components/HallOfFame.tsx`: el botón "VOLVER A LA BIBLIOTECA" pasa a apuntar a `/biblioteca` (coincide con su propio texto).
   - `components/GameDetail.tsx` y `components/GamePlayer.tsx`: los botones "VOLVER AL VAULT" mantienen su destino en `/` (ahora la landing), consistente con su texto genérico ("vault" = el sitio, no la biblioteca específicamente).
   - `components/Auth.tsx`: los `router.push("/")` tras iniciar sesión o entrar como invitado se mantienen apuntando a `/` (ahora la landing).
7. Correr `npm run lint` y `npm run build`, y navegar manualmente `/`, `/biblioteca` y el resto de las rutas en `npm run dev` para verificar que todos los enlaces cruzados funcionan y el efecto de scroll-reveal se ve correctamente.

---

## Acceptance criteria

- [ ] `npm run dev` levanta la app sin errores en consola.
- [ ] La ruta `/` muestra la landing: hero con eslogan y CTAs, siluetas flotantes animadas, sección de features, preview de 6 juegos, stats, actividad en vivo (últimas puntuaciones + top jugadores), precios con FAQ, y CTA final.
- [ ] La ruta `/biblioteca` muestra exactamente lo mismo que mostraba `/` antes de este spec (buscador, chips de categoría, grid de 8 juegos).
- [ ] Las secciones marcadas con `reveal` aparecen con fade-in/translate al hacer scroll hasta ellas.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/biblioteca`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/iniciar-sesion`.
- [ ] "VER SALÓN →" navega a `/salon-de-la-fama`.
- [ ] Cada mini-card de la sección "Juegos disponibles ahora" navega a `/juego/<id>` del juego correspondiente.
- [ ] El Nav muestra "Inicio" y "Biblioteca" como links separados en desktop y en el panel móvil; "Inicio" se resalta solo en `/`, "Biblioteca" se resalta en `/biblioteca` y en `/juego/*`.
- [ ] El logo del Nav sigue enlazando a `/`.
- [ ] Iniciar sesión, crear cuenta o entrar como invitado desde `/iniciar-sesion` redirige a `/` (la landing).
- [ ] Desde `/salon-de-la-fama`, "VOLVER A LA BIBLIOTECA" navega a `/biblioteca`.
- [ ] Desde el detalle de un juego o el reproductor, "VOLVER AL VAULT" navega a `/`.
- [ ] No existe ninguna ruta ni componente para "Acerca de".
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** la landing (`home.jsx`) pasa a ser la ruta `/`, y la Biblioteca se mueve a `/biblioteca`. Es fiel al prototipo original (`nav.jsx` trae "Inicio" y "Biblioteca" como items de menú separados) y evita que la landing quede "escondida" en una ruta secundaria.
- **No:** dejar la landing en una ruta como `/inicio` y mantener la Biblioteca en `/`. Se apartaría del comportamiento del prototipo y del sentido común de un sitio con landing pública.
- **Sí:** agregar el link "Inicio" al Nav, replicando `nav.jsx`.
- **Sí:** portar el CSS de la landing (`home-hero`, `feature-grid`, `mini-rail`, `home-stats`, `activity-grid`, `pricing-grid`, `reveal`, etc.) literalmente a `globals.css`, siguiendo el mismo enfoque de SPEC 01 de reutilizar el CSS ya escrito del prototipo.
- **No:** reescribir la landing con utilidades de Tailwind. Apartarse del CSS ya diseñado en el prototipo introduciría inconsistencias visuales y trabajo innecesario.
- **Sí:** los datos hardcodeados de la landing (features, actividad reciente, top jugadores, stats) se portan tal cual dentro de `components/Home.tsx`, sin moverlos a `lib/data.ts`. Son contenido de demostración puramente visual, igual de "vitrina" que los datos ya hardcodeados en `data.ts` para otras pantallas, y no necesitan un modelo compartido porque ningún otro componente los consume.
- **Sí:** "VOLVER A LA BIBLIOTECA" (Salón de la Fama) apunta específicamente a `/biblioteca`, mientras que "VOLVER AL VAULT" (Detalle de juego, Reproductor) apunta a `/`. La distinción sigue el propio texto de cada botón: uno nombra explícitamente la biblioteca, el otro es un "volver al inicio del sitio" genérico.
- **No:** dejar `about.jsx` fuera de alcance de este spec, según lo pedido explícitamente. Si se necesita en el futuro, será un spec propio.
- **Sí:** `components/Home.tsx` es un client component (`"use client"`) porque necesita `useEffect` e `IntersectionObserver` para el efecto de scroll-reveal, igual que otros componentes interactivos ya portados en SPEC 01.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Enlaces internos rotos al mover la Biblioteca de `/` a `/biblioteca` (código o marcado que asuma la ruta vieja) | Paso 6 del plan de implementación enumera explícitamente cada enlace afectado y su nuevo destino; se verifica navegando manualmente todas las rutas en el paso 7. |
| Las clases CSS nuevas de la landing choquen con nombres ya usados en `globals.css` (namespacing genérico como `.stat-*`, `.pc-*`) | Antes de portar, revisar `globals.css` en busca de colisiones de nombre con las clases nuevas y renombrar solo si hay conflicto real; el prototipo ya evita colisiones entre sus propias pantallas. |
| El efecto `IntersectionObserver` de `useReveal` no se limpia correctamente y genera fugas de memoria al navegar entre rutas (App Router desmonta/monta) | Portar el `return () => io.disconnect()` del `useEffect` tal cual viene en `home.jsx`, que ya maneja la limpieza. |

---

## What is **not** in this spec

- La pantalla "Acerca de" (`about.jsx`).
- Datos reales de actividad, ranking o estadísticas (siguen siendo estáticos/decorativos).
- Cualquier funcionalidad ya excluida en SPEC 01 (juegos reales, backend, tests automatizados, i18n, etc.).

Cada uno de estos, si se necesita, va en su propio spec.
