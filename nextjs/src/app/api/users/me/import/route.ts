import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, unauthorized, badRequest, serverError } from "@/lib/get-session";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { ImportUserCommentsUseCase } from "@/application/use-cases/ImportUserCommentsUseCase";

export const dynamic = "force-dynamic";

const MAX_COMMENTS = 5_000;

const CommentSchema = z.object({
  bookReference: z.string().min(1),
  text: z.string().min(1),
  tags: z.array(z.string()).optional(),
  onTitle: z.boolean().optional(),
});

// The export endpoint dumps a richer object (profile, ownedDiscussions,
// answersAuthored, notifications). Import scope for v1 is comments only —
// the rest is ignored if present, which keeps the same export file as a
// drop-in restore source.
const PayloadSchema = z.object({
  comments: z.array(CommentSchema).max(MAX_COMMENTS),
});

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Arquivo não é um JSON válido.");
    }

    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Formato do arquivo de backup inválido.");
    }

    const useCase = new ImportUserCommentsUseCase(
      new MongoCommentRepository(),
      new MongoVerseRepository(),
    );
    const result = await useCase.execute(sessionUser.username, parsed.data.comments);

    return NextResponse.json(result);
  } catch (err) {
    return serverError(err);
  }
}
