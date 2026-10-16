import {
  getActiveSessionUser,
  unauthorized,
  tooManyRequests,
  serverError,
} from "@/lib/get-session";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { makeExportUserDataUseCase } from "@/app/actions/_account";
import { buildExportResponse, exportCounts } from "./buildResponse";

export const dynamic = "force-dynamic";

// Each export runs ~20 queries on a small connection pool. Per instance
// only (in-memory buckets), which softens abuse rather than bounding it.
const EXPORT_RATE_LIMIT = { windowMs: 10 * 60_000, max: 5 };

// LGPD Art. 18 (II, V): access and portability. Returns a JSON file with
// every record kept about the signed-in account (ExportUserDataUseCase).
export async function GET() {
  try {
    // Re-checked against the DB: a session revoked by a password change, or
    // an account being deleted or disabled, can't download the dump during
    // the session cache window.
    const sessionUser = await getActiveSessionUser();
    if (!sessionUser) return unauthorized();

    const limit = checkRateLimit(`data-export:${sessionUser.id}`, EXPORT_RATE_LIMIT);
    if (!limit.allowed) {
      return tooManyRequests(
        "Muitas exportações seguidas. Tente novamente em alguns minutos.",
        limit.resetAt,
      );
    }

    const dump = await makeExportUserDataUseCase().execute(sessionUser.id);
    if (!dump) return unauthorized();

    const { response, bytes } = buildExportResponse(dump);
    // Ids, sizes and counts only: the content itself is personal data.
    logger.info(
      { action: "data_export", userId: sessionUser.id, bytes, counts: exportCounts(dump) },
      "data export generated",
    );
    return response;
  } catch (err) {
    return serverError(err);
  }
}
