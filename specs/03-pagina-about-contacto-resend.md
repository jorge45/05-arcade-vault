# SPEC 03 — Página "About" y envío de correo de contacto con Resend

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-05
> **Objective:** Portar la pantalla "Acerca de" del prototipo (`references/resources/templates/home-about/about.jsx`) como la nueva ruta `/about`, y conectar su formulario de contacto a un envío real de correo electrónico vía Resend.

---

## Scope

**In:**

- Nueva ruta `/about` que renderiza el componente `About`: hero con misión ("ACERCA DE ARCADE VAULT"), fila de 3 highlights con íconos pixel-art, divisor animado, y sección de contacto con formulario (nombre, correo, mensaje).
- Porte literal a `app/globals.css` de las clases CSS del template aún no existentes: `about`, `about-hero`, `about-title`, `about-mission`, `highlight-row`, `highlight` (+ `.cyan`/`.magenta`/`.green`), `hl-icon`, `hl-text`, `about-divider`, `div-bar`, `div-pixels`, `about-contact`, `contact-grid`, `contact-intro`, `contact-title`, `contact-sub`, `contact-tips`, `tip`, `tip-led` (+ `.y`/`.m`), `contact-form` (+ `.shake`), `terminal-success`, `term-bar`, `dot` (+ `.r`/`.y`/`.g`), `term-title`, `term-body`, `line` (+ `.dim`/`.success`), `prompt`, `caret`. Las clases base ya existentes (`pixel`, `reveal`, `kicker`) se reutilizan sin cambios.
- Componente `components/About.tsx` (`"use client"`, usa `useEffect`/`IntersectionObserver` para el efecto `reveal` del divisor, igual que `components/Home.tsx` en SPEC 02), portando `About`, `HighlightIcon` desde `about.jsx`.
- Actualización de `components/Nav.tsx`: se agrega el link "Acerca de" → `/about` en el menú desktop y en el panel móvil, con resaltado activo cuando `pathname === "/about"`.
- Envío real del formulario de contacto vía Resend:
  - Nuevo route handler `app/api/contacto/route.ts` (`POST`) que usa el SDK `resend` en el servidor para enviar el correo.
  - El formulario hace `fetch("/api/contacto", { method: "POST", body: JSON.stringify(form) })` en vez de simular el envío localmente como hace `about.jsx`.
  - Remitente: `onboarding@resend.dev` (dominio de pruebas de Resend). Destinatario: `jleitonarias@gmail.com`. `reply-to` del correo enviado = el email ingresado en el formulario.
  - Asunto del correo: `"Nuevo mensaje de contacto — Arcade Vault"`. Cuerpo: nombre, email y mensaje del formulario, en texto plano simple.
  - Validación en el formulario: campos vacíos (igual que el prototipo, dispara el efecto `shake`) + formato de email válido (regex simple) antes de hacer el `fetch`.
  - Estado de carga: mientras la petición está en curso, el botón "ENVIAR MENSAJE" se deshabilita y cambia su texto a "ENVIANDO...".
  - Estado de error: si el route handler responde con error (API key inválida, error de red, error de Resend), se muestra un mensaje de error en rojo debajo del formulario y el formulario vuelve a su estado editable para reintentar. No se muestra la terminal de éxito en ese caso.
  - Estado de éxito: igual al prototipo (`terminal-success` con las líneas de "consola" y el mensaje final), se muestra solo si el `fetch` responde OK.
- Nueva dependencia `resend` en `package.json`.
- Variable de entorno `RESEND_API_KEY`, documentada en `.env.example` (vacía) y configurada con el valor real en `.env.local` (no versionado) durante `/spec-impl`.

**Out of scope (para futuros specs):**

- Verificar un dominio propio en Resend (se usa el dominio de pruebas `onboarding@resend.dev`).
- Guardar los mensajes de contacto en una base de datos o cualquier persistencia; el correo es el único registro.
- Rate limiting o protección anti-spam/captcha en el endpoint `/api/contacto`.
- Emails transaccionales adicionales (confirmación al remitente, notificaciones de otro tipo); solo se implementa el correo que llega al equipo.
- Cualquier cambio a otras pantallas, mecánica de juegos o autenticación ya cubiertos o excluidos en SPEC 01/02.

---

## Data model

No se introduce ningún modelo de datos persistente. Se define únicamente el contrato del endpoint `app/api/contacto/route.ts`:

```ts
// Request body (JSON)
type ContactRequest = {
  name: string;
  email: string;
  msg: string;
};

// Response
// 200 OK: { ok: true }
// 400/500: { ok: false, error: string }
```

El estado local del formulario en `components/About.tsx` reutiliza la forma de `about.jsx` (`{ name, email, msg }`) agregando un estado `status: "idle" | "sending" | "sent" | "error"` para controlar el botón y los mensajes.

---

## Implementation plan

1. Instalar la dependencia `resend` (`npm install resend`) y agregar `RESEND_API_KEY=` a un nuevo `.env.example`. Configurar `RESEND_API_KEY` con el valor real en `.env.local` (no versionado).
2. Añadir a `app/globals.css` las clases listadas en el scope, portadas literalmente desde `references/resources/templates/home-about/styles.css`.
3. Crear `app/api/contacto/route.ts`: valida el body (`name`, `email`, `msg` no vacíos y `email` con formato válido), instancia `Resend` con `process.env.RESEND_API_KEY`, envía el correo (`from: "onboarding@resend.dev"`, `to: "jleitonarias@gmail.com"`, `reply_to: email`, `subject: "Nuevo mensaje de contacto — Arcade Vault"`, cuerpo con nombre/email/mensaje) y responde `{ ok: true }` o `{ ok: false, error }` con el status code correspondiente.
4. Crear `components/About.tsx` portando `About` y `HighlightIcon` desde `about.jsx`: mismo JSX y clases, reemplazando el `onSubmit` simulado por un `fetch` a `/api/contacto` con los estados `idle`/`sending`/`sent`/`error` descritos en el scope.
5. Crear `app/about/page.tsx` que renderiza `<About />`.
6. Actualizar `components/Nav.tsx`: agregar el link "Acerca de" → `/about` (desktop y móvil) con su lógica de resaltado (`isAbout = pathname === "/about"`).
7. Correr `npm run lint` y `npm run build`, navegar manualmente a `/about` en `npm run dev`, enviar el formulario con datos válidos y confirmar que llega el correo a `jleitonarias@gmail.com`; probar también el caso de error (p.ej. con una API key inválida temporal) para verificar el estado de error en la UI.

---

## Acceptance criteria

- [ ] `npm run dev` levanta la app sin errores en consola.
- [ ] La ruta `/about` muestra el hero de misión, la fila de 3 highlights, el divisor animado y la sección de contacto con el formulario.
- [ ] El Nav muestra "Acerca de" como link en desktop y en el panel móvil, resaltado solo en `/about`.
- [ ] Enviar el formulario con nombre, email y mensaje vacíos dispara el efecto `shake` y no hace ninguna petición de red.
- [ ] Enviar el formulario con un email de formato inválido (ej. `"abc"`) dispara el efecto `shake` y no hace ninguna petición de red.
- [ ] Enviar el formulario con datos válidos deshabilita el botón y muestra "ENVIANDO..." mientras la petición está en curso.
- [ ] Un envío exitoso muestra la `terminal-success` con el nombre ingresado, igual que el prototipo.
- [ ] Un envío exitoso hace llegar un correo real a `jleitonarias@gmail.com` con asunto `"Nuevo mensaje de contacto — Arcade Vault"`, el `reply-to` configurado al email del formulario, y el nombre/mensaje en el cuerpo.
- [ ] Si el endpoint responde con error, se muestra un mensaje de error en el formulario (sin mostrar la terminal de éxito) y el formulario queda editable para reintentar.
- [ ] `RESEND_API_KEY` no está hardcodeada en ningún archivo versionado; se lee de `process.env` en `app/api/contacto/route.ts`.
- [ ] `.env.example` documenta `RESEND_API_KEY` sin valor real.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** la ruta es `/about`, siguiendo el nombre del archivo del prototipo (`about.jsx`), a diferencia de las demás rutas que están en español. Decisión explícita del usuario al definir el spec.
- **No:** traducir la ruta a `/acerca-de`. Se descartó para mantener el nombre tal como pide el usuario.
- **Sí:** el envío de correo pasa por un route handler (`app/api/contacto/route.ts`) en vez de una Server Action, para mantener el patrón de API explícita y poder reutilizar `fetch` directo desde el cliente sin acoplar el formulario a la convención de Server Actions.
- **No:** usar Server Actions. Se descartó para mantener el flujo de datos explícito (request/response JSON) y facilitar la prueba manual del endpoint de forma aislada.
- **Sí:** remitente `onboarding@resend.dev` (dominio de pruebas de Resend) y destinatario fijo `jleitonarias@gmail.com`, hardcodeados en el route handler. No hay dominio propio verificado todavía ni necesidad de configurar el destinatario dinámicamente.
- **Sí:** se agrega validación de formato de email en el cliente (regex simple), además de la validación de "campos vacíos" que ya trae el prototipo. Evita envíos claramente inválidos sin agregar una librería de validación.
- **No:** agregar una librería de validación de formularios (ej. zod, react-hook-form). Sería sobre-ingeniería para un formulario de 3 campos.
- **Sí:** se agrega un estado de carga ("ENVIANDO...") que no existe en el prototipo, porque ahora el envío es una llamada de red real y no una simulación síncrona.
- **Sí:** en caso de error del lado del servidor, se muestra un estado de error explícito en la UI (no se finge éxito), para que el usuario sepa que debe reintentar.
- **No:** persistir los mensajes de contacto en una base de datos. El correo es el único registro, consistente con que el proyecto no tiene backend de datos real aún (SPEC 01/02).
- **No:** rate limiting ni captcha en el endpoint. Fuera de alcance para este MVP; se dejaría para un spec de hardening si se vuelve necesario.
- **Sí:** `RESEND_API_KEY` se gestiona vía variable de entorno (`.env.local`, no versionado) y se documenta vacía en `.env.example`, siguiendo el patrón estándar de Next.js/Resend.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El dominio de pruebas `onboarding@resend.dev` de Resend puede tener límites de envío o ser rechazado por algunos proveedores de correo | Aceptable para el MVP; si se necesita mayor fiabilidad, un spec futuro cubre la verificación de un dominio propio. |
| Las nuevas clases CSS de `about`/`contact`/`terminal-success` choquen con nombres ya usados en `globals.css` | Antes de portar, revisar `globals.css` en busca de colisiones (ya se confirmó que ninguna de estas clases existe hoy); el prototipo ya evita colisiones entre sus propias pantallas. |
| `RESEND_API_KEY` ausente o inválida en producción causa que todos los envíos fallen silenciosamente | El route handler responde `{ ok: false, error }` con status de error, y la UI lo muestra explícitamente en vez de fingir éxito. |

---

## What is **not** in this spec

- Verificación de dominio propio en Resend.
- Persistencia de los mensajes de contacto en base de datos.
- Rate limiting, captcha o protección anti-spam.
- Emails transaccionales adicionales (confirmación al remitente, etc.).
- Cualquier funcionalidad ya excluida en SPEC 01/02 (juegos reales, backend de datos, tests automatizados, i18n, etc.).

Cada uno de estos, si se necesita, va en su propio spec.
