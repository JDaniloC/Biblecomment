"use server";

import { headers } from "next/headers";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoPasswordResetTokenRepository } from "@/infrastructure/repositories/MongoPasswordResetTokenRepository";
import {
  RequestPasswordResetUseCase,
  CompletePasswordResetUseCase,
} from "@/application/use-cases/PasswordRecoveryUseCases";
import { sendEmail } from "@/lib/email";
import { renderPasswordResetEmail } from "@/lib/emails/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

const REQUEST_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 10 };

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

const passwordResetEmailer = {
  async sendPasswordReset(to: string, username: string, link: string): Promise<void> {
    const rendered = renderPasswordResetEmail({ username, link });
    await sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  },
};

function appUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}

/**
 * Request a password reset for `email`. ALWAYS resolves to `{ submitted: true }`
 * so the response cannot be used to enumerate registered emails. Internal
 * logging captures the actual outcome (sent / unknown / rate-limited).
 */
export async function requestPasswordResetAction(
  email: string,
): Promise<ActionResult<{ submitted: true }>> {
  try {
    const ip = await clientIp();
    const limit = checkRateLimit(`pwreset:${ip}`, REQUEST_RATE_LIMIT);
    if (!limit.allowed) {
      logger.warn(
        { ip, action: "password_reset_request" },
        "password reset rate-limit hit (per-IP)",
      );
      // Still return ok so the response stays uniform — caller can't
      // distinguish rate-limit from any other silent drop.
      return { ok: true, data: { submitted: true } };
    }

    const useCase = new RequestPasswordResetUseCase(
      new MongoUserRepository(),
      new MongoPasswordResetTokenRepository(),
      passwordResetEmailer,
    );
    const sent = await useCase.execute(email ?? "", appUrl());
    logger.info(
      {
        ip,
        email: typeof email === "string" ? email.toLowerCase() : null,
        sent,
        action: "password_reset_request",
      },
      sent ? "password reset email dispatched" : "password reset request silently dropped",
    );
  } catch (err) {
    // Email-send failures must not surface to the user. Log loud so prod
    // alerts pick up Resend outages.
    logger.error({ err, action: "requestPasswordResetAction" }, "password reset request failed");
  }
  return { ok: true, data: { submitted: true } };
}

/**
 * Consume a reset token and rotate the user's password. Returns a typed
 * error when the token is invalid/expired or the new password is too short.
 */
export async function completePasswordResetAction(
  token: string,
  newPassword: string,
): Promise<ActionResult<{ updated: true }>> {
  try {
    const useCase = new CompletePasswordResetUseCase(
      new MongoUserRepository(),
      new MongoPasswordResetTokenRepository(),
    );
    await useCase.execute(token ?? "", newPassword ?? "");
    logger.info({ action: "password_reset_complete" }, "password reset completed");
    return { ok: true, data: { updated: true } };
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    logger.error({ err, action: "completePasswordResetAction" }, "password reset complete failed");
    return { ok: false, error: "Erro ao redefinir senha." };
  }
}
