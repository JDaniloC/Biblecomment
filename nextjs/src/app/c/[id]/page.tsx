import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MongoCommentRepository } from "@/infrastructure/repositories/MongoCommentRepository";
import { MongoVerseRepository } from "@/infrastructure/repositories/MongoVerseRepository";
import {
	clampForCard,
	formatCommentReference,
	verseDeepLinkPath,
} from "@/lib/share-comment";
import { ShareForward } from "./ShareForward";

interface PageProps {
	params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { id } = await params;
	const comment = await new MongoCommentRepository().findById(id);
	if (!comment) return { title: "Comentário — Bible Comment" };
	const verse = await new MongoVerseRepository().findById(comment.verseId);
	const ref = formatCommentReference(comment, verse ?? undefined);
	const title = `@${comment.username} em ${ref} — Bible Comment`;
	const description = clampForCard(comment.text, 160);
	// metadataBase is set in app/layout.tsx, so a relative image path resolves
	// to an absolute URL for crawlers. ?format=wide = 1200x630 unfurl.
	const image = `/api/og/comment/${id}?format=wide`;
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: [{ url: image, width: 1200, height: 630 }],
			type: "article",
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [image],
		},
	};
}

export default async function CommentSharePage({ params }: PageProps) {
	const { id } = await params;
	const comment = await new MongoCommentRepository().findById(id);
	if (!comment) notFound();
	const verse = await new MongoVerseRepository().findById(comment.verseId);
	const href = verse ? verseDeepLinkPath(verse) : "/home";
	return <ShareForward href={href} />;
}
