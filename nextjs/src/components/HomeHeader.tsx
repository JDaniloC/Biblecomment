"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthMenu } from "@/components/AuthMenu";
import { Logo } from "@/components/Logo";

interface SessionUser {
	name?: string | null;
	username: string;
	email?: string | null;
	moderator?: boolean;
}

interface Props {
	user: SessionUser | null;
}

/**
 * Landing-page header — minimal by design. The body of `/` already ships
 * a hero search and a books index, so the header drops both. Anonymous
 * visitors get prominent Entrar / Registrar CTAs; authenticated visitors
 * get the same AuthMenu used elsewhere so the affordance is consistent.
 *
 * Logo destination is dynamic: anonymous → "/" (stays on landing),
 * authenticated → "/home" (jumps to dashboard).
 */
export function HomeHeader({ user }: Props) {
	const logoHref = user ? "/home" : "/";

	return (
		<header className="bg-white dark:bg-slate-900 dark:border-b dark:border-slate-800 shadow-sm sticky top-0 z-20">
			<div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
				<Link
					href={logoHref}
					className="flex items-center gap-2 sm:gap-3 shrink-0 no-underline"
					aria-label="Bible Comment — início"
				>
					<Logo width={36} height={36} />
					<div className="hidden sm:block">
						<h1 className="text-sm font-bold text-gray-800 dark:text-slate-100 leading-tight">
							Bible Comment
						</h1>
						<span className="text-xs text-gray-500 dark:text-slate-400">
							A Program for His Glory
						</span>
					</div>
				</Link>

				<div className="flex items-center gap-2 sm:gap-3 shrink-0">
					<Link
						href="/help"
						aria-label="Ajuda e tutorial"
						className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand hover:text-brand transition text-sm font-bold leading-none no-underline"
					>
						?
					</Link>
					<ThemeToggle />
					{user ? (
						<AuthMenu user={user} />
					) : (
						<>
							<Link
								href="/login"
								className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand dark:hover:text-brand transition px-2 sm:px-3 py-1.5 no-underline"
							>
								Entrar
							</Link>
							<Link
								href="/register"
								className="text-sm font-semibold bg-brand text-white px-3 sm:px-4 py-1.5 rounded-md hover:opacity-90 transition no-underline"
							>
								Registrar
							</Link>
						</>
					)}
				</div>
			</div>
		</header>
	);
}
