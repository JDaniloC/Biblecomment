import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import { commentToCardProps } from "@/lib/share-comment";
import { CommentShareCard } from "@/components/CommentShareCard";

// Mongoose is not edge-safe and we read the logo from disk — Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// public/assets/logo.png is actually a JPEG (mislabeled), which satori
// silently fails to decode — the card rendered with a blank logo slot.
// icon-512.png is a real, square, transparent PNG (the app/PWA mark).
async function logoDataUri(): Promise<string> {
	const buf = await readFile(
		path.join(process.cwd(), "public", "icons", "icon-512.png"),
	);
	return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const format =
		new URL(req.url).searchParams.get("format") === "wide" ? "wide" : "square";

	const comment = await new MongoCommentRepository().findById(id);
	if (!comment) {
		return new Response("Comment not found", { status: 404 });
	}
	const verse = await new MongoVerseRepository().findById(comment.verseId);

	const card = commentToCardProps(
		{
			_id: comment._id,
			text: comment.text,
			username: comment.username,
			tags: comment.tags,
			verified: comment.verified,
			communitySlug: comment.communitySlug,
			bookReference: comment.bookReference,
		},
		verse ?? {
			abbrev: "",
			chapter: 0,
			verseNumber: 0,
			reference: comment.bookReference,
		},
		new URL(req.url).origin,
	);

	const logo = await logoDataUri();
	const size =
		format === "wide"
			? { width: 1200, height: 630 }
			: { width: 1080, height: 1080 };

	return new ImageResponse(
		<CommentShareCard card={card} logoDataUri={logo} format={format} />,
		{
			...size,
			// The card for a given id is near-immutable (only changes if the
			// comment is edited). force-dynamic keeps it correct after edits,
			// but without caching every crawler/preview hit re-runs satori +
			// two Mongo lookups — a cheap amplification vector. Let the CDN
			// serve it for an hour and revalidate in the background.
			headers: {
				"Cache-Control":
					"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
			},
		},
	);
}
