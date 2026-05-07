import { NextResponse } from "next/server";
import { MongoCommentReportRepository } from "@/infrastructure/repositories/MongoCommentReportRepository";
import { ClearReportsUseCase } from "@/application/use-cases/CommentUseCases";
import { getSessionUser, forbidden, serverError } from "@/lib/get-session";
import { logger } from "@/lib/logger";

type Params = { id: string };

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user?.moderator) return forbidden();

    const { id } = await params;
    const useCase = new ClearReportsUseCase(new MongoCommentReportRepository());
    const result = await useCase.execute(id);

    logger.info(
      { actor: user.email, commentId: id, cleared: result.cleared, action: "clear_reports" },
      "comment reports cleared",
    );

    return NextResponse.json({ _id: result.commentId, cleared: result.cleared });
  } catch (err) {
    return serverError(err);
  }
}
