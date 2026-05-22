import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoCommentLikeRepository } from "@/infrastructure/repositories/MongoCommentLikeRepository";
import { MongoCommentReportRepository } from "@/infrastructure/repositories/MongoCommentReportRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoNotificationRepository } from "@/infrastructure/repositories/MongoNotificationRepository";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import {
  CreateCommentUseCase,
  UpdateCommentUseCase,
  DeleteCommentUseCase,
  ToggleLikeUseCase,
  ReportCommentUseCase,
  SetCommentHiddenUseCase,
  UNHIDE_ACCOUNT_DISABLED_ERROR,
} from "@/application/use-cases/CommentUseCases";
import { NotifyMentionsUseCase } from "@/application/use-cases/NotifyMentionsUseCase";
import { getSessionUser, unauthorized, forbidden, badRequest, notFound, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { CreateCommentSchema, UpdateCommentSchema } from "@/lib/schemas";

type Params = { id: string };

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id: verseId } = await params;
    const parsed = await parseBody(req, CreateCommentSchema);
    if (!parsed.ok) return parsed.response;
    const { text, tags, on_title, onTitle, communitySlug } = parsed.data;
    const titleFlag = onTitle ?? on_title ?? false;

    const commentRepo = new MongoCommentRepository();
    const verseRepo = new MongoVerseRepository();
    const useCase = new CreateCommentUseCase(
      commentRepo,
      verseRepo,
      new MongoCommunityRepository(),
      new MongoCommunityMembershipRepository(),
      new MongoUserRepository(),
    );

    const comment = await useCase.execute({
      verseId,
      username: user.username,
      text,
      tags,
      onTitle: titleFlag,
      communitySlug,
    });

    const verse = await verseRepo.findById(verseId);
    if (verse && comment._id) {
      const notifyMentions = new NotifyMentionsUseCase(
        new MongoUserRepository(),
        new MongoNotificationRepository(),
      );
      await notifyMentions.execute({
        text,
        actor: user.username,
        type: "comment_mention",
        resourceType: "comment",
        resourceId: comment._id,
        url: `/verses/${verse.abbrev}/${verse.chapter}#${verse.verseNumber}`,
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Verse not found") return badRequest("Versículo não encontrado");
      if (err.message === "Community not found") return badRequest("Comunidade não encontrada");
      if (err.message === "Not a community member") return forbidden();
    }
    return serverError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const parsed = await parseBody(req, UpdateCommentSchema);
    if (!parsed.ok) return parsed.response;
    const { text, tags, action } = parsed.data;

    const repo = new MongoCommentRepository();

    if (action === "like") {
      const useCase = new ToggleLikeUseCase(repo, new MongoCommentLikeRepository());
      // Returns { commentId, likeCount, likedByMe } — the chapter listings use
      // the same shape, so the client can update its local state without a refetch.
      return NextResponse.json(await useCase.execute(id, user.id));
    }

    if (action === "report") {
      const useCase = new ReportCommentUseCase(repo, new MongoCommentReportRepository());
      // Returns { commentId, reportCount, reportedByMe } — same shape family
      // as toggleLike for consistency at the API boundary.
      return NextResponse.json(await useCase.execute(id, user.id, user.username));
    }

    if (action === "hide" || action === "unhide") {
      // Soft-hide is a moderator-only action.
      if (!user.moderator) return forbidden();
      const useCase = new SetCommentHiddenUseCase(repo);
      return NextResponse.json(
        await useCase.execute(id, action === "hide", user.username),
      );
    }

    if (!text) return badRequest("text é obrigatório");
    const useCase = new UpdateCommentUseCase(repo);
    return NextResponse.json(await useCase.execute(id, user.username, text, tags ?? []));
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "Comment not found") return notFound("Comentário não encontrado");
      if (err.message === UNHIDE_ACCOUNT_DISABLED_ERROR) return forbidden();
    }
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const useCase = new DeleteCommentUseCase(
      new MongoCommentRepository(),
      new MongoCommentLikeRepository(),
      new MongoCommentReportRepository(),
    );
    await useCase.execute(id, user.username, user.moderator);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Unauthorized") return forbidden();
      if (err.message === "Comment not found") return notFound("Comentário não encontrado");
    }
    return serverError(err);
  }
}
