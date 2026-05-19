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
		<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
			<div className="flex flex-col items-center gap-6 text-center max-w-sm">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src="/assets/logo.svg"
					alt=""
					aria-hidden="true"
					width={64}
					height={64}
					className="w-16 h-16"
				/>
				<div>
					<div className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
						BibleComment
					</div>
					<div className="font-light text-xs text-[#888] dark:text-slate-400">
						A Program for His Glory
					</div>
				</div>

				<div
					className="w-7 h-7 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-brand animate-spin"
					role="status"
					aria-label="Carregando"
				/>

				<p className="text-sm text-slate-600 dark:text-slate-300 m-0">
					Abrindo o comentário no contexto…
				</p>
				<a
					href={href}
					className="text-sm font-semibold text-brand hover:underline"
				>
					Toque aqui se não for redirecionado
				</a>
			</div>
		</div>
	);
}
