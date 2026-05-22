import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { MongoCommunityMembershipRepository } from "@/infrastructure/repositories/MongoCommunityMembershipRepository";
import { MongoCommunityFollowRepository } from "@/infrastructure/repositories/MongoCommunityFollowRepository";
import { CreateCommunityUseCase } from "@/application/use-cases/CommunityUseCases";
import { CreateCommunitySchema } from "@/lib/schemas";

const PAGE_SIZE = 24;

export const dynamic = "force-dynamic";

/** Public listing with optional search query (prefix on slug + ci on name). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const query = url.searchParams.get("q") ?? undefined;
  const result = await new MongoCommunityRepository().list({
    page,
    pageSize: PAGE_SIZE,
    query: query?.trim() || undefined,
  });
  return NextResponse.json({ ...result, page, pageSize: PAGE_SIZE });
}

/** Authenticated create. Maps known domain errors to HTTP codes. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateCommunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const community = await new CreateCommunityUseCase(
      new MongoCommunityRepository(),
      new MongoUserRepository(),
      new MongoCommunityMembershipRepository(),
      new MongoCommunityFollowRepository(),
    ).execute({
      actorEmail: session.user.email,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description,
    });
    return NextResponse.json({ community }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("in use")) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
    }
    if (msg.includes("limit")) {
      return NextResponse.json(
        { error: "Você atingiu o limite de 3 comunidades criadas." },
        { status: 403 },
      );
    }
    if (msg.includes("Invalid")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
