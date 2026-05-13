import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoUserChapterReadRepository } from "@/infrastructure/repositories/MongoUserChapterReadRepository";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ abbrev: string }> },
) {
  const { abbrev } = await params;
  const session = await auth();
  // Anonymous viewers get an empty set rather than 401 — the picker is a
  // public view and the client treats "no reads" identically to "not logged in."
  if (!session?.user?.id) return NextResponse.json({ chapters: [] });

  const repo = new MongoUserChapterReadRepository();
  const chapters = await repo.findChaptersForBook(session.user.id, abbrev);
  return NextResponse.json({ chapters });
}
