"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Humans hitting a shared /c/<id> link get bounced to the verse in context.
 * We do NOT server-redirect (a 307 would make social crawlers follow it and
 * read the verse page's meta instead of the comment card). Crawlers don't
 * run JS, so they stay on /c/<id> and read its OG/Twitter meta; humans get
 * router.replace'd here, with a plain link as the no-JS fallback.
 */
export function ShareForward({ href }: { href: string }) {
	const router = useRouter();
	useEffect(() => {
		router.replace(href);
	}, [router, href]);

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 24,
				textAlign: "center",
			}}
		>
			<p>
				Abrindo o comentário no contexto…{" "}
				<a href={href} className="text-brand underline">
					Toque aqui se não for redirecionado
				</a>
			</p>
		</div>
	);
}
