export interface EmailVerificationParams {
  username: string;
  link: string;
  /** When true, copy emphasizes "confirm the new address". */
  isChange?: boolean;
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

export function renderEmailVerificationEmail(params: EmailVerificationParams): RenderedEmail {
  const { username, link, isChange = false } = params;
  const safeName = escapeHtml(username);
  const safeLink = escapeHtml(link);

  const subject = isChange
    ? "Bible Comment — confirme seu novo e-mail"
    : "Bible Comment — confirme seu e-mail";

  const intro = isChange
    ? "Recebemos um pedido para alterar o e-mail da sua conta no <strong>Bible Comment</strong>. Para concluir a troca, confirme o novo endereço abaixo."
    : "Para liberar comentários, discussões e mostrar o selo de verificado no seu perfil, confirme seu e-mail abaixo.";

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fafaf9;color:#1c1917;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:32px;">
      <h1 style="font-size:20px;margin:0 0 16px;">Olá ${safeName},</h1>
      <p style="line-height:1.6;margin:0 0 16px;">${intro}</p>
      <p style="margin:24px 0;">
        <a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#137ddb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          Confirmar e-mail
        </a>
      </p>
      <p style="line-height:1.6;margin:0 0 8px;color:#57534e;font-size:14px;">
        O link expira em 24 horas. Se você não pediu isso, ignore este e-mail.
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
    isChange
      ? `Recebemos um pedido para alterar o e-mail da sua conta no Bible Comment.`
      : `Para liberar comentários e mostrar o selo de verificado no seu perfil, confirme seu e-mail abaixo.`,
    ``,
    `Acesse o link abaixo para confirmar (expira em 24 horas):`,
    link,
    ``,
    `Se você não pediu isso, ignore este e-mail.`,
  ].join("\n");

  return { subject, html, text };
}
