// Envío del código de confirmación.
//
// No agregamos SDKs: Resend y Brevo se usan con fetch.
// Configuración (por variables de entorno en Fly):
//   RESEND_API_KEY=re_...      + EMAIL_FROM="Plata <no-reply@tudominio.com>"
//   BREVO_API_KEY=xkeysib-...  + EMAIL_FROM="Plata <tu-correo-verificado@gmail.com>"
//
// Sin ninguna API key, en desarrollo el código se imprime en la consola del
// server y en producción el registro responde con un error claro.

type SendResult = { ok: true } | { ok: false; message: string };

export type EmailMode = "resend" | "brevo" | "console";

export function emailMode(): EmailMode {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.BREVO_API_KEY) return "brevo";
  return "console";
}

export function isEmailConfigured(): boolean {
  return emailMode() !== "console";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Plata <no-reply@x.com>" -> { name, email } */
function parseFrom(raw: string): { name: string; email: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || "Plata", email: match[2] };
  return { name: "Plata", email: raw.trim() };
}

function renderText(name: string, code: string, minutes: number): string {
  return [
    `Hola ${name}:`,
    "",
    `Tu código para confirmar la cuenta en Plata es: ${code}`,
    `Vence en ${minutes} minutos.`,
    "",
    "Si no fuiste vos, ignorá este correo y no compartas el código con nadie.",
  ].join("\n");
}

function renderHtml(name: string, code: string, minutes: number): string {
  const safeName = escapeHtml(name);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f4f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Plata</p>
        <h1 style="margin:0 0 16px;font-size:19px;">Confirmá tu cuenta</h1>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#334155;">
          Hola ${safeName}, este es tu código para terminar el registro:
        </p>
        <p style="margin:0 0 18px;font-size:34px;font-weight:700;letter-spacing:10px;color:#0f172a;background:#f1f5f9;border-radius:12px;padding:14px 0;text-align:center;">${code}</p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">
          Vence en ${minutes} minutos.
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
          Si no fuiste vos, ignorá este correo y no compartas el código con nadie.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  code: string,
  minutes: number,
): Promise<SendResult> {
  const mode = emailMode();
  const fromRaw = process.env.EMAIL_FROM ?? "";

  if (mode === "console") {
    // En producción se permite explícitamente con EMAIL_CONSOLE_FALLBACK=true
    // (útil para una instalación personal sin proveedor de correo).
    const allowed =
      process.env.NODE_ENV !== "production" || process.env.EMAIL_CONSOLE_FALLBACK === "true";
    if (!allowed) {
      return {
        ok: false,
        message: "El envío de correos no está configurado. Avisá al administrador.",
      };
    }
    console.log(`\n[email] Código para ${to}: ${code} (vence en ${minutes} min)\n`);
    return { ok: true };
  }

  if (!fromRaw) {
    return {
      ok: false,
      message: "Falta configurar EMAIL_FROM para enviar el código.",
    };
  }

  const subject = "Tu código de confirmación de Plata";
  const text = renderText(name, code, minutes);
  const html = renderHtml(name, code, minutes);

  try {
    if (mode === "resend") {
      const from = parseFrom(fromRaw);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${from.name} <${from.email}>`,
          to: [to],
          subject,
          html,
          text,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { ok: false, message: "No pudimos enviar el correo. Probá de nuevo." };
      return { ok: true };
    }

    const from = parseFrom(fromRaw);
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": String(process.env.BREVO_API_KEY),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: from.email, name: from.name },
        to: [{ email: to, name }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, message: "No pudimos enviar el correo. Probá de nuevo." };
    return { ok: true };
  } catch {
    return { ok: false, message: "No pudimos enviar el correo. Revisá tu conexión y probá de nuevo." };
  }
}
