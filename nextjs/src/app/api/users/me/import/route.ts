import { NextResponse } from "next/server";
import {
  getActiveSessionUser,
  unauthorized,
  badRequest,
  forbidden,
  tooManyRequests,
  serverError,
} from "@/lib/get-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { EmailNotVerifiedError } from "@/lib/auth-guards";
import { ImportCommentsPayloadSchema } from "@/lib/schemas";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { ImportUserCommentsUseCase } from "@/application/use-cases/ImportUserCommentsUseCase";

export const dynamic = "force-dynamic";

// Up to 5000 rows per call: metered per user id (not IP, so shared NATs
// aren't penalized). In-memory per instance, like the export's limit.
const IMPORT_RATE_LIMIT = { windowMs: 60 * 60_000, max: 5 };

// The export endpoint dumps a richer object (profile, discussions, follows,
// ...). Import scope is comments only — the rest is ignored if present,
// which keeps the same export file as a drop-in restore source.
export async function POST(req: Request) {
  try {
    // Re-checked against the DB (revoked session, disabled or deleting
    // account); the use case re-reads the account by id as well.
    const sessionUser = await getActiveSessionUser();
    if (!sessionUser) return unauthorized();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Arquivo não é um JSON válido.");
    }

    const parsed = ImportCommentsPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Formato do arquivo de backup inválido.");
    }

    // Checked after validation, so retrying a malformed file doesn't burn
    // a token, while the DB-heavy work below is metered.
    const limit = checkRateLimit(`comment-import:${sessionUser.id}`, IMPORT_RATE_LIMIT);
    if (!limit.allowed) {
      logger.warn({ action: "import_comments", userId: sessionUser.id }, "comment import rate-limit hit");
      return tooManyRequests(
        "Muitas importações em pouco tempo. Tente novamente mais tarde.",
        limit.resetAt,
      );
    }

    const useCase = new ImportUserCommentsUseCase(
      new MongoCommentRepository(),
      new MongoVerseRepository(),
      new MongoUserRepository(),
    );
    const result = await useCase.execute(sessionUser.id, parsed.data.comments);

    logger.info({ action: "import_comments", userId: sessionUser.id, ...result }, "comments imported");
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof EmailNotVerifiedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Unauthorized") return forbidden();
    return serverError(err);
  }
}
