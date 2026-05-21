"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";
import {
  MarkChapterReadUseCase,
  UnmarkChapterReadUseCase,
  GetReadChaptersForBookUseCase,
} from "@/application/use-cases/MarkChapterReadUseCases";
import { evaluateBadges } from "./_badge-evaluator";
import { logger } from "@/lib/logger";
import type { ActionResult } from "./comments";

function authError(): ActionResult<never> {
  return { ok: false, error: "Unauthorized" };
}

function appError(err: unknown, fallback: string): ActionResult<never> {
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: fallback };
}

export interface MarkReadResult {
  marked: boolean;
  unlockedBadges: string[];
}

export async function markChapterReadAction(
  abbrev: string,
  chapter: number,
): Promise<ActionResult<MarkReadResult>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoUserChapterReadRepository();
    const inserted = await new MarkChapterReadUseCase(repo).execute(
      session.user.id,
      abbrev,
      chapter,
    );

    let unlockedBadges: string[] = [];
    if (inserted) {
      // Only re-evaluate when the mark is actually new — repeated clicks are
      // idempotent in the DB (no insert) and shouldn't fan out badge work.
      unlockedBadges = await evaluateBadges({
        userId: session.user.id,
        username: session.user.username,
        axes: ["reader-volume", "reader-section", "reader-streak", "interaction"],
        // The reader-* counters will be (re)read from the DB; that's fine —
        // the new mark is already persisted before we evaluate.
      });
    }

    revalidatePath(`/chapter/${abbrev.toLowerCase()}/${chapter}`, "page");
    return { ok: true, data: { marked: inserted, unlockedBadges } };
  } catch (err) {
    logger.error(
      { err, action: "markChapterReadAction", abbrev, chapter },
      "mark chapter read failed",
    );
    return appError(err, "Erro ao marcar capítulo como lido.");
  }
}

export async function unmarkChapterReadAction(
  abbrev: string,
  chapter: number,
): Promise<ActionResult<{ unmarked: true }>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoUserChapterReadRepository();
    await new UnmarkChapterReadUseCase(repo).execute(session.user.id, abbrev, chapter);
    revalidatePath(`/chapter/${abbrev.toLowerCase()}/${chapter}`, "page");
    return { ok: true, data: { unmarked: true } };
  } catch (err) {
    logger.error(
      { err, action: "unmarkChapterReadAction", abbrev, chapter },
      "unmark chapter read failed",
    );
    return appError(err, "Erro ao desfazer marcação.");
  }
}

export async function getReadChaptersForBookAction(
  abbrev: string,
): Promise<ActionResult<{ chapters: number[] }>> {
  const session = await auth();
  if (!session?.user) return authError();

  try {
    const repo = new MongoUserChapterReadRepository();
    const chapters = await new GetReadChaptersForBookUseCase(repo).execute(
      session.user.id,
      abbrev,
    );
    return { ok: true, data: { chapters } };
  } catch (err) {
    logger.error(
      { err, action: "getReadChaptersForBookAction", abbrev },
      "get read chapters failed",
    );
    return appError(err, "Erro ao buscar capítulos lidos.");
  }
}
