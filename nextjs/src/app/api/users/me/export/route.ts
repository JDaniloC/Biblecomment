import { NextResponse } from "next/server";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { NotificationModel } from "@/infrastructure/database/models/NotificationModel";

export const dynamic = "force-dynamic";

// LGPD Art. 18(V): right to data portability. Returns a JSON dump of every
// record tied to the authenticated user — profile, comments, discussions
// they started, answers they wrote inside other discussions, and inbound
// notifications. Discussions are queried via findAll so we can scoop up
// embedded answers authored by the user even on threads they didn't open.
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    const userRepo = new MongoUserRepository();
    const commentRepo = new MongoCommentRepository();
    const discussionRepo = new MongoDiscussionRepository();

    const user = await userRepo.findByEmail(sessionUser.email);
    if (!user) return unauthorized();

    const username = user.username;
    const [comments, allDiscussions] = await Promise.all([
      commentRepo.findByUsername(username),
      discussionRepo.findAll(),
    ]);

    const ownedDiscussions = allDiscussions.filter((d) => d.username === username);
    const answersAuthored = allDiscussions
      .filter((d) => d.username !== username)
      .flatMap((d) =>
        d.answers
          .filter((a) => a.name === username)
          .map((a) => ({
            discussionId: d._id,
            verseReference: d.verseReference,
            text: a.text,
          })),
      );

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
