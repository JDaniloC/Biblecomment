import { Resend } from "resend";
import { logger } from "./logger";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SentEmail extends EmailPayload {
  sentAt: Date;
  transport: "resend" | "memory" | "noop";
}

declare global {
  // eslint-disable-next-line no-var
  var __sentEmails: SentEmail[] | undefined;
}

let resendClient: Resend | null = null;
let resendKey: string | undefined;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    resendClient = null;
    resendKey = undefined;
    return null;
  }
  if (resendClient && resendKey === apiKey) return resendClient;
  resendClient = new Resend(apiKey);
  resendKey = apiKey;
  return resendClient;
}

function recordMemory(payload: EmailPayload): void {
  globalThis.__sentEmails ??= [];
  globalThis.__sentEmails.push({
    ...payload,
    sentAt: new Date(),
    transport: "memory",
  });
}

export function getMemoryInbox(): SentEmail[] {
  return globalThis.__sentEmails ?? [];
}

export function clearMemoryInbox(): void {
  globalThis.__sentEmails = [];
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transport = process.env.EMAIL_TRANSPORT;

  if (transport === "memory") {
    recordMemory(payload);
    logger.debug({ to: payload.to, subject: payload.subject }, "email captured (memory)");
    return;
  }

  const client = getResendClient();
  if (!client) {
    logger.warn(
      { to: payload.to, subject: payload.subject },
      "RESEND_API_KEY missing — email not sent",
    );
    return;
  }

  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const { error } = await client.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }

  logger.info({ to: payload.to, subject: payload.subject }, "email sent");
}
