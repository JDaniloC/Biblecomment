"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoEmailVerificationTokenRepository } from "@/infrastructure/repositories/MongoEmailVerificationTokenRepository";
import {
  RequestEmailVerificationUseCase,
  ConfirmEmailVerificationUseCase,
  RequestEmailChangeUseCase,
} from "@/application/use-cases/EmailVerificationUseCases";
import { sendEmail } from "@/lib/email";
import { renderEmailVerificationEmail } from "@/lib/emails/email-verification";
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

function appUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}

function makeEmailer(isChange: boolean) {
  return {
    async sendEmailVerification(to: string, username: string, link: string): Promise<void> {
      const rendered = renderEmailVerificationEmail({ username, link, isChange });
      await sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    },
  };
}

export async function requestEmailVerificationAction(): Promise<ActionResult<{ submitted: true }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

    const ip = await clientIp();
    const limit = checkRateLimit(`emailverify:${ip}`, REQUEST_RATE_LIMIT);
    if (!limit.allowed) {
      logger.warn({ ip, action: "email_verification_request" }, "email verification rate-limit hit (per-IP)");
      return { ok: true, data: { submitted: true } };
    }

    const useCase = new RequestEmailVerificationUseCase(
      new MongoUserRepository(),
      new MongoEmailVerificationTokenRepository(),
      makeEmailer(false),
    );
    const sent = await useCase.execute(session.user.id, appUrl());
    logger.info(
      { userId: session.user.id, sent, action: "email_verification_request" },
      sent ? "verification email dispatched" : "verification request silently dropped",
    );
  } catch (err) {
    logger.error({ err, action: "requestEmailVerificationAction" }, "verification request failed");
  }
  return { ok: true, data: { submitted: true } };
}

export async function requestEmailChangeAction(newEmail: string): Promise<ActionResult<{ submitted: true }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

    const ip = await clientIp();
    const limit = checkRateLimit(`emailchange:${ip}`, REQUEST_RATE_LIMIT);
    if (!limit.allowed) {
      logger.warn({ ip, action: "email_change_request" }, "email change rate-limit hit (per-IP)");
      return { ok: true, data: { submitted: true } };
    }

    const useCase = new RequestEmailChangeUseCase(
      new MongoUserRepository(),
      new MongoEmailVerificationTokenRepository(),
      makeEmailer(true),
    );
    await useCase.execute(session.user.id, newEmail ?? "", appUrl());
    return { ok: true, data: { submitted: true } };
  } catch (err) {
    if (err instanceof Error) return { ok: false, error: err.message };
    logger.error({ err, action: "requestEmailChangeAction" }, "email change failed");
    return { ok: false, error: "Erro ao solicitar troca de e-mail." };
  }
}

export async function cancelEmailChangeAction(): Promise<ActionResult<{ cancelled: true }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Unauthorized" };
    const repo = new MongoUserRepository();
    await repo.clearPendingEmail(session.user.id);
    return { ok: true, data: { cancelled: true } };
  } catch (err) {
    logger.error({ err, action: "cancelEmailChangeAction" }, "cancel email change failed");
    return { ok: false, error: "Erro ao cancelar troca de e-mail." };
  }
}

export async function confirmEmailVerificationAction(
  token: string,
): Promise<ActionResult<{ verified: true; newEmail: string | null }>> {
  try {
    const useCase = new ConfirmEmailVerificationUseCase(
      new MongoUserRepository(),
      new MongoEmailVerificationTokenRepository(),
    );
    const { newEmail } = await useCase.execute(token ?? "");
    logger.info({ action: "email_verification_confirm" }, "email verified");
    return { ok: true, data: { verified: true, newEmail } };
  } catch (err) {
    if (err instanceof Error) return { ok: false, error: err.message };
    logger.error({ err, action: "confirmEmailVerificationAction" }, "verification confirm failed");
    return { ok: false, error: "Erro ao confirmar e-mail." };
  }
}
