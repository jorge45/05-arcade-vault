import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { name, email, msg } = await request.json();

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof msg !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !msg.trim()
  ) {
    return Response.json(
      { ok: false, error: "Todos los campos son obligatorios." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return Response.json(
      { ok: false, error: "El correo electrónico no es válido." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "jleitonarias@gmail.com",
    replyTo: email.trim(),
    subject: "Nuevo mensaje de contacto — Arcade Vault",
    text: `Nombre: ${name.trim()}\nEmail: ${email.trim()}\n\nMensaje:\n${msg.trim()}`,
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
