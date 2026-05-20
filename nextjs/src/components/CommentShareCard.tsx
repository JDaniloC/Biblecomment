import { getTagMetas } from "@/lib/tag-meta";
import { pickCardFontSize, type CommentCardProps } from "@/lib/share-comment";

/**
 * Inline-styled card consumed by `next/og` ImageResponse (satori) — NO
 * Tailwind, NO hooks, every multi-child node sets display:flex (satori
 * requirement). Server-only.
 */
export function CommentShareCard({
	card,
	logoDataUri,
	format = "square",
}: {
	card: CommentCardProps;
	logoDataUri: string;
	format?: "square" | "wide";
}) {
	const wide = format === "wide";
	const pad = wide ? 64 : 88;
	// Scale the comment text font with its length so a 700-char Sodoma-
	// style comment doesn't get cut off mid-word at "decorrer d…". Tiered
	// so visual stability is maintained across small length deltas.
	const textSize = pickCardFontSize(card.text.length, format);
	const brand = "#1075d3";
	const metas = getTagMetas(card.tags);

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				background: "#ffffff",
				padding: pad,
				fontFamily: "sans-serif",
			}}
		>
			{/* Header: mirrors the in-app AppHeader exactly —
			    logo + "BibleComment" title + "A Program for His Glory"
			    subtitle, same colors/weights. */}
			<div style={{ display: "flex", alignItems: "center", gap: 18 }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={logoDataUri}
					alt=""
					width={wide ? 60 : 76}
					height={wide ? 60 : 76}
				/>
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div
						style={{
							display: "flex",
							fontSize: wide ? 32 : 40,
							fontWeight: 700,
							color: "#1e293b",
							lineHeight: 1.2,
						}}
					>
						BibleComment
					</div>
					<div
						style={{
							display: "flex",
							fontSize: wide ? 18 : 22,
							fontWeight: 300,
							color: "#888888",
						}}
					>
						A Program for His Glory
					</div>
				</div>
			</div>

			{/* Body: reference + comment text */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 28,
					flex: 1,
					justifyContent: "center",
					paddingTop: 36,
					paddingBottom: 36,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
					<div
						style={{
							display: "flex",
							background: "rgba(16,117,211,0.10)",
							color: brand,
							fontWeight: 700,
							fontSize: wide ? 26 : 32,
							padding: "8px 20px",
							borderRadius: 14,
						}}
					>
						{card.reference}
					</div>
					{card.verified && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: wide ? 34 : 40,
								height: wide ? 34 : 40,
								borderRadius: 999,
								background: "rgba(5,150,105,0.12)",
								color: "#059669",
								fontSize: wide ? 22 : 26,
								fontWeight: 800,
							}}
						>
							✓
						</div>
					)}
				</div>
				<div
					style={{
						display: "flex",
						fontSize: textSize,
						lineHeight: 1.35,
						color: "#1e293b",
						fontWeight: 500,
					}}
				>
					{`“${card.text}”`}
				</div>
			</div>

			{/* Footer: author + tags + url */}
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
					{metas.map((m) => (
						<div
							key={m.label}
							style={{
								display: "flex",
								background: m.bg,
								color: m.color,
								fontWeight: 700,
								fontSize: wide ? 22 : 26,
								padding: "6px 16px",
								borderRadius: 999,
							}}
						>
							{m.label}
						</div>
					))}
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							display: "flex",
							fontSize: wide ? 26 : 32,
							fontWeight: 700,
							color: "#334155",
						}}
					>
						{`@${card.username}`}
					</div>
					<div
						style={{
							display: "flex",
							fontSize: wide ? 22 : 26,
							color: brand,
							fontWeight: 600,
						}}
					>
						biblecomment
					</div>
				</div>
			</div>
		</div>
	);
}
