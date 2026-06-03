/**
 * Site-wide JSON-LD structured data (Server Component).
 *
 * Emits an Organization + WebSite `@graph` so search engines treat
 * "Bible Comment", "BibleComment" (the domain spelling) and the Portuguese
 * intent terms ("Bíblia Comentada", "Comentário Bíblico", "Estudos Bíblicos")
 * as a single brand entity. The WebSite node also advertises the on-site
 * `/search` route via a SearchAction so Google can surface a sitelinks
 * search box.
 *
 * Base URL is read from the same source as `metadataBase` in layout.tsx and
 * the sitemap so all three stay in lockstep.
 */
export function StructuredData() {
	const base = (
		process.env.NEXTAUTH_URL ?? "http://localhost:3000"
	).replace(/\/+$/, "");

	const graph = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Organization",
				"@id": `${base}/#organization`,
				name: "Bible Comment",
				alternateName: [
					"BibleComment",
					"Bíblia Comentada",
					"Comentário Bíblico",
					"Estudos Bíblicos",
				],
				url: base,
				logo: `${base}/icons/icon-512.png`,
				inLanguage: "pt-BR",
				description:
					"Bíblia comentada online: leia, comente e discuta a Palavra de Deus com comentários, exegese e estudos bíblicos da comunidade.",
			},
			{
				"@type": "WebSite",
				"@id": `${base}/#website`,
				name: "Bible Comment",
				url: base,
				inLanguage: "pt-BR",
				publisher: { "@id": `${base}/#organization` },
				potentialAction: {
					"@type": "SearchAction",
					target: `${base}/search?q={search_term_string}`,
					"query-input": "required name=search_term_string",
				},
			},
		],
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
		/>
	);
}
