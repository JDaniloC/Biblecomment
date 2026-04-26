import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { ClearReportsUseCase } from "@/application/use-cases/CommentUseCases";
import { getSessionUser, forbidden, notFound, serverError } from "@/lib/get-session";
import { logger } from "@/lib/logger";

type Params = { id: string };

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const { id } = await params;
    const repo = new MongoCommentRepository();
    const useCase = new ClearReportsUseCase(repo);
    const updated = await useCase.execute(id);

    logger.info(
      { actor: user.email, commentId: id, action: "clear_reports" },
      "comment reports cleared",
    );

    return NextResponse.json({ _id: updated._id, reports: updated.reports });
  } catch (err) {
    if (err instanceof Error && err.message === "Comment not found") {
      return notFound("Comment not found");
    }
    return serverError(err);
  }
}
