import { describe, it, expect } from "vitest";
import {
	formatCommentShareUrl,
	formatCommentReference,
	verseDeepLinkPath,
	clampForCard,
	pickCardFontSize,
	formatCommentShare,
	commentToCardProps,
} from "./share-comment";

const verse = {
	abbrev: "gn",
	chapter: 1,
	verseNumber: 1,
	reference: "Gênesis 1:1",
};

describe("formatCommentShareUrl", () => {
	it("composes the canonical /c/<id> URL from origin", () => {
		expect(formatCommentShareUrl("abc123", "https://app.example.com")).toBe(
			"https://app.example.com/c/abc123",
		);
	});
	it("strips trailing slashes from origin", () => {
		expect(formatCommentShareUrl("abc123", "https://app.example.com///")).toBe(
			"https://app.example.com/c/abc123",
		);
	});
});

describe("formatCommentReference", () => {
	it("prefers the comment's stored bookReference", () => {
		expect(formatCommentReference({ bookReference: "João 3:16" }, verse)).toBe(
			"João 3:16",
		);
	});
	it("prefers the verse's own reference when the comment has none", () => {
		expect(formatCommentReference({}, verse)).toBe("Gênesis 1:1");
	});
	it("derives ABBREV chap:verse when neither comment nor verse has a reference", () => {
		expect(formatCommentReference({}, { ...verse, reference: undefined })).toBe(
			"GN 1:1",
		);
	});
});

describe("verseDeepLinkPath", () => {
	it("builds the in-app verse hash path", () => {
		expect(verseDeepLinkPath(verse)).toBe("/verses/gn/1#1");
	});
});

describe("clampForCard", () => {
	it("returns trimmed text unchanged when within the limit", () => {
		expect(clampForCard("  hello world  ", 280)).toBe("hello world");
	});
	it("truncates with an ellipsis and never exceeds max length", () => {
		const long = "a".repeat(1500);
		const out = clampForCard(long, 280);
		expect(out.length).toBeLessThanOrEqual(280);
		expect(out.endsWith("…")).toBe(true);
	});
	it("does not add an ellipsis exactly at the boundary", () => {
		const exact = "x".repeat(280);
		expect(clampForCard(exact, 280)).toBe(exact);
	});
	it("defaults to a 1000-char cap matching the platform comment limit", () => {
		const long = "a".repeat(1500);
		const out = clampForCard(long);
		expect(out.length).toBe(1000);
		expect(out.endsWith("…")).toBe(true);
	});
});

describe("pickCardFontSize", () => {
	it("uses the largest tier for short text", () => {
		expect(pickCardFontSize(120)).toBe(52);
		expect(pickCardFontSize(120, "wide")).toBe(40);
	});
	it("shrinks monotonically as text grows", () => {
		const lengths = [50, 250, 400, 600, 900];
		const sizes = lengths.map((l) => pickCardFontSize(l));
		for (let i = 1; i < sizes.length; i++) {
			expect(sizes[i]).toBeLessThan(sizes[i - 1]);
		}
	});
	it("clamps at the smallest tier for max-length comments", () => {
		expect(pickCardFontSize(1000)).toBe(26);
		expect(pickCardFontSize(1000, "wide")).toBe(20);
	});
});

describe("formatCommentShare", () => {
	it("formats quoted text, author, reference and link", () => {
		expect(
			formatCommentShare(
				{
					text: "Texto do comentário",
					username: "alice",
					reference: "Gênesis 1:1",
				},
				"https://app.example.com/c/abc123",
			),
		).toBe(
			'"Texto do comentário" — @alice (Gênesis 1:1)\nhttps://app.example.com/c/abc123',
		);
	});
});

describe("commentToCardProps", () => {
	it("maps a comment + verse into card props (clamped text, ref, url, deep link)", () => {
		const props = commentToCardProps(
			{
				_id: "abc123",
				text: "  Um comentário  ",
				username: "bob",
				tags: ["exegese", "pessoal"],
				verified: true,
				bookReference: "Gênesis 1:1",
			},
			verse,
			"https://app.example.com",
		);
		expect(props).toEqual({
			text: "Um comentário",
			username: "bob",
			reference: "Gênesis 1:1",
			tags: ["exegese", "pessoal"],
			verified: true,
			communitySlug: undefined,
			url: "https://app.example.com/c/abc123",
			verseHref: "/verses/gn/1#1",
		});
	});
});
