import { NextResponse } from "next/server";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { serverError } from "@/lib/get-session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") ?? searchParams.get("q") ?? "";

    if (!text) return NextResponse.json([]);

    const repo = new MongoCommentRepository();
    const comments = await repo.searchByText(text);

    return NextResponse.json(
      comments.map((c) => ({
        id: c._id,
        text: c.text,
        username: c.username,
        book_reference: c.bookReference,
        created_at: c.createdAt,
      }))
    );
  } catch {
    return serverError();
  }
}
