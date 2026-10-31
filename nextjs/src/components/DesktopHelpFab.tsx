"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DesktopHelpFab() {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const isHelpPage = pathname === "/help" || pathname?.startsWith("/help/");

	// Close on click outside
	useEffect(() => {
		if (!open) return;
		function handleClickOutside(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	const handleStartTour = () => {
		setOpen(false);
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("bc:start-tour"));
		}
	};

	return (
		<aside
			ref={menuRef}
			aria-label="Menu de ajuda e tutoriais"
			className="bc-desktop-help-fab hidden md:flex fixed bottom-5 right-5 z-40 flex-col items-end transition-[right] duration-200"
		>
			{open && (
				<div
					data-testid="desktop-help-menu"
					className="mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0px_10px_38px_rgba(0,0,0,0.16),0px_3px_10px_rgba(0,0,0,0.08)] p-1.5 flex flex-col gap-1 text-sm animate-in fade-in slide-in-from-bottom-2 duration-150"
				>
					<div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
						Ajuda e Aprendizado
					</div>

					<button
						type="button"
						onClick={handleStartTour}
						data-testid="start-page-tour-btn"
						className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand transition font-medium"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-brand shrink-0"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="10" />
							<polygon points="10 8 16 12 10 16 10 8" />
						</svg>
						<span className="flex-1">
							{isHelpPage ? "Tutorial da Central de Ajuda" : "Tutorial desta página"}
						</span>
					</button>

					{!isHelpPage ? (
						<Link
							href="/help"
							onClick={() => setOpen(false)}
							data-testid="help-center-link"
							className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand transition font-medium no-underline"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-slate-400 dark:text-slate-500 shrink-0"
								aria-hidden="true"
							>
								<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
								<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
							</svg>
							<span className="flex-1">Central de Ajuda</span>
						</Link>
					) : (
						<Link
							href="/home"
							onClick={() => setOpen(false)}
							data-testid="help-home-link"
							className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand transition font-medium no-underline"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-slate-400 dark:text-slate-500 shrink-0"
								aria-hidden="true"
							>
								<path d="M3 11l9-8 9 8" />
								<path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10" />
							</svg>
							<span className="flex-1">Ir para Livros & Leitor</span>
						</Link>
					)}
				</div>
			)}

			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-label="Ajuda e tutorial"
				aria-expanded={open}
				title="Ajuda e tutorial"
				data-testid="desktop-help-fab"
				className="w-11 h-11 rounded-full shadow-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand hover:shadow-xl transition-all flex items-center justify-center font-bold text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30"
			>
				?
			</button>
		</aside>
	);
}
