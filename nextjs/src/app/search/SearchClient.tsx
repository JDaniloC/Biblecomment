"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { AppHeader } from "@/components/AppHeader";

interface SessionUser {
	name: string;
	email: string;
	username: string;
	moderator: boolean;
}

interface VerseHit {
	_id: string;
	reference: string;
	abbrev: string;
	chapter: number;
	verseNumber: number;
	text: string;
}

interface CommentHit {
	_id: string;
	bookReference: string;
	text: string;
	username: string;
	abbrev: string;
	chapter: number;
	verse: number;
}

interface UnifiedResponse {
	verses: VerseHit[];
	comments: CommentHit[];
}

type ResultRow =
	| { kind: "verse"; data: VerseHit }
	| { kind: "comment"; data: CommentHit };

export default function SearchClient({ user }: { user: SessionUser }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<ResultRow[]>([]);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleSearch = useCallback((text: string) => {
		setQuery(text);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (!text.trim()) {
			setResults([]);
			return;
		}
		debounceRef.current = setTimeout(async () => {
			setLoading(true);
			try {
				const { data } = await axios.get<UnifiedResponse>(
					`/api/search/unified?q=${encodeURIComponent(text)}`,
				);
				const merged: ResultRow[] = [
					...data.verses.map((v): ResultRow => ({ kind: "verse", data: v })),
					...data.comments.map(
						(c): ResultRow => ({ kind: "comment", data: c }),
					),
				];
				setResults(merged);
			} catch {
				setResults([]);
			} finally {
				setLoading(false);
			}
		}, 500);
	}, []);

	// Prefill + auto-run from ?q= / ?text= so the manifest share_target
	// ("/search?q={text}") and the "Buscar" app shortcut land on results.
	// Runs once; /login already round-trips callbackUrl so a shared link
	// continues here after auth.
	const didInitFromUrl = useRef(false);
	useEffect(() => {
		if (didInitFromUrl.current) return;
		const initial = (
			searchParams?.get("q") ??
			searchParams?.get("text") ??
			""
		).trim();
		if (initial) {
			didInitFromUrl.current = true;
			handleSearch(initial);
		}
	}, [searchParams, handleSearch]);

	const goTo = useCallback(
		(row: ResultRow) => {
			if (row.kind === "verse") {
				const { abbrev, chapter, verseNumber } = row.data;
				router.push(`/verses/${abbrev}/${chapter}#${verseNumber}`);
			} else {
				const { abbrev, chapter, verse } = row.data;
				if (abbrev && chapter) {
					router.push(`/verses/${abbrev}/${chapter}#${verse || 1}`);
				}
			}
		},
		[router],
	);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-slate-950">
			<AppHeader user={user} />

			<main id="main-content" className="max-w-3xl mx-auto px-4 py-6">
				<h1 className="font-semibold text-2xl text-gray-800 dark:text-slate-100 mb-2">
					Buscar
				</h1>
				<p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
					Procure por trecho do versículo, texto de um comentário, ou referência
					(ex.: <span className="font-medium">Gn 1:1</span> ou{" "}
					<span className="font-medium">Gênesis 1</span>).
				</p>

				<div className="relative mb-6">
					<Image
						src="/assets/search.svg"
						alt=""
						aria-hidden="true"
						width={20}
						height={20}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:opacity-70"
					/>
					<label htmlFor="search-input" className="sr-only">
						Buscar versículos ou comentários
					</label>
					<input
						id="search-input"
						type="text"
						value={query}
						onChange={(e) => handleSearch(e.target.value)}
						placeholder="Versículo, comentário ou referência…"
						className="w-full border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
					{query && (
						<button
							type="button"
							onClick={() => {
								setQuery("");
								setResults([]);
							}}
							aria-label="Limpar busca"
							className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
						>
							<Image
								src="/assets/x.svg"
								alt=""
								aria-hidden="true"
								width={16}
								height={16}
							/>
						</button>
					)}
				</div>

				{loading ? (
					<div className="text-center text-gray-400 dark:text-slate-500 py-8">
						Buscando...
					</div>
				) : results.length > 0 ? (
					<ul className="space-y-3">
						{results.map((row) => (
							<li
								key={`${row.kind}-${row.data._id}`}
								role="button"
								tabIndex={0}
								onClick={() => goTo(row)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										goTo(row);
									}
								}}
								className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 dark:hover:border-brand transition focus:outline-none focus:ring-2 focus:ring-brand"
							>
								<div className="flex items-center gap-2 mb-1">
									<ResultBadge kind={row.kind} />
									<span className="text-xs text-blue-600 dark:text-brand font-medium">
										{row.kind === "verse"
											? row.data.reference
											: row.data.bookReference}
									</span>
								</div>
								<p className="text-sm text-gray-700 dark:text-slate-200 line-clamp-3">
									{row.data.text}
								</p>
								{row.kind === "comment" && (
									<div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
										por {row.data.username}
									</div>
								)}
							</li>
						))}
					</ul>
				) : query ? (
					<div className="text-center text-gray-400 dark:text-slate-500 py-8">
						Nenhum resultado encontrado.
					</div>
				) : (
					<div className="text-center text-gray-400 dark:text-slate-500 py-8">
						<Image
							src="/assets/search.svg"
							alt=""
							aria-hidden="true"
							width={48}
							height={48}
							className="mx-auto mb-3 opacity-30"
						/>
						<p>Digite algo para buscar</p>
					</div>
				)}
			</main>
		</div>
	);
}

function ResultBadge({ kind }: { kind: "verse" | "comment" }) {
	const isVerse = kind === "verse";
	return (
		<span
			className={`inline-flex items-center h-[18px] px-1.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
				isVerse
					? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
					: "bg-brand-tint text-brand"
			}`}
		>
			{isVerse ? "Versículo" : "Comentário"}
		</span>
	);
}
