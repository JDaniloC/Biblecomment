export interface PasswordResetEmailParams {
  username: string;
  link: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPasswordResetEmail(params: PasswordResetEmailParams): RenderedEmail {
  const { username, link } = params;
  const safeName = escapeHtml(username);
  const safeLink = escapeHtml(link);

  const subject = "Bible Comment — redefinição de senha";

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fafaf9;color:#1c1917;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:32px;">
      <h1 style="font-size:20px;margin:0 0 16px;">Olá ${safeName},</h1>
      <p style="line-height:1.6;margin:0 0 16px;">
        Recebemos um pedido para redefinir sua senha no <strong>Bible Comment</strong>.
      </p>
      <p style="margin:24px 0;">
        <a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#b45309;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          Redefinir senha
        </a>
      </p>
      <p style="line-height:1.6;margin:0 0 8px;color:#57534e;font-size:14px;">
        O link expira em 30 minutos. Se você não pediu a redefinição, ignore este e-mail — sua senha continua a mesma.
      </p>
      <p style="line-height:1.6;margin:16px 0 0;color:#a8a29e;font-size:12px;word-break:break-all;">
        Caso o botão não funcione, copie e cole no navegador:<br>
        ${safeLink}
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `Olá ${username},`,
    ``,
    `Recebemos um pedido para redefinir sua senha no Bible Comment.`,
    ``,
    `Acesse o link abaixo para criar uma nova senha (expira em 30 minutos):`,
    link,
    ``,
    `Se você não pediu a redefinição, ignore este e-mail — sua senha continua a mesma.`,
  ].join("\n");

  return { subject, html, text };
}
