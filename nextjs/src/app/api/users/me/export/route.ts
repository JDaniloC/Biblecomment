import { NextResponse } from "next/server";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { NotificationModel } from "@/infrastructure/database/models/NotificationModel";

export const dynamic = "force-dynamic";

// LGPD Art. 18(V): right to data portability. Returns a JSON dump of every
// record tied to the authenticated user — profile, comments, discussions
// they started, answers they wrote (in any thread), and inbound notifications.
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    const userRepo = new MongoUserRepository();
    const commentRepo = new MongoCommentRepository();
    const discussionRepo = new MongoDiscussionRepository();
    const answerRepo = new MongoDiscussionAnswerRepository();

    const user = await userRepo.findByEmail(sessionUser.email);
    if (!user) return unauthorized();

    const username = user.username;
    const userId = user._id ?? "";

    const [comments, allDiscussions, myAnswers] = await Promise.all([
      commentRepo.findByUsername(username),
      discussionRepo.findAll(),
      answerRepo.findByUser(userId),
    ]);

    const ownedDiscussions = allDiscussions.filter((d) => d.username === username);
    // Reattach verseReference to each answer for the dump's readability.
    const discussionsById = new Map(allDiscussions.map((d) => [d._id ?? "", d]));
    const answersAuthored = myAnswers.map((a) => ({
      discussionId: a.discussionId,
      verseReference: discussionsById.get(a.discussionId)?.verseReference ?? null,
      text: a.text,
      createdAt: a.createdAt,
    }));

    await connectToDatabase();
    const notifications = await NotificationModel.find({ recipient: username })
      .sort({ createdAt: -1 })
      .lean();

    const { password: _pw, ...safeProfile } = user;

    const dump = {
      generatedAt: new Date().toISOString(),
      profile: safeProfile,
      comments,
      ownedDiscussions,
      answersAuthored,
      notifications: notifications.map((n) => ({
        type: n.type,
        actor: n.actor,
        message: n.message,
        url: n.url,
        read: n.read,
        createdAt: n.createdAt,
      })),
    };

    return new NextResponse(JSON.stringify(dump, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="biblecomment-meus-dados-${username}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
