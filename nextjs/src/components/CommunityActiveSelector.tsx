"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	useActiveCommunity,
	type FollowedCommunity,
} from "@/lib/hooks/useCommunityFilter";

interface Props {
	/** Signed-in username; null hides the picker. */
	username: string | null | undefined;
	/** Fired when the picker closes (e.g. after a pick) so the wrapping
	 *  AppHeader dropdown can collapse too. */
	onPick?: () => void;
}

/**
 * Searchable single-select for the user's followed communities. Lives in
 * the AppHeader profile dropdown (plan_community follow-up).
 *
 * No external combobox library — the codebase has no headlessui / cmdk
 * dependency and the list is tiny (followers per user are in the tens,
 * not thousands). Filters by case-insensitive substring on `name` and
 * `slug` and keyboard-navigates with Up/Down/Enter/Esc.
 *
 * `data-testid="active-community-select"` is preserved from the legacy
 * <select> so Cypress fixtures keep working. The interactive surface
 * follows the WAI-ARIA "Editable Combobox With List Autocomplete"
 * pattern: the search <input> carries `role="combobox"` +
 * `aria-controls` + `aria-expanded`, and the dropdown <ul> is the
 * popup `role="listbox"`. `aria-activedescendant` points at the
 * highlighted option so screen readers track keyboard navigation
 * without focus jumping out of the input.
 */
export function CommunityActiveSelector({ username, onPick }: Props) {
	const { active, setActive, followed } = useActiveCommunity(username);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [highlight, setHighlight] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	// Stable IDs so the combobox can point at its listbox via
	// aria-controls and at the highlighted row via aria-activedescendant.
	const listboxId = "bc-active-community-listbox";
	const optionId = (slug: string | null) =>
		`bc-active-community-opt-${slug ?? "none"}`;

	const activeName = followed.find((c) => c.slug === active)?.name ?? null;

	// Options = "Nenhuma" + filtered list. Empty query → full list; non-empty
	// query → case-insensitive substring on name/slug. Stable sort by name to
	// make the keyboard arrow path predictable.
	const options = useMemo<Array<{ slug: string | null; name: string }>>(() => {
		const q = query.trim().toLowerCase();
		const filtered: FollowedCommunity[] = q
			? followed.filter(
					(c) =>
						c.name.toLowerCase().includes(q) ||
						c.slug.toLowerCase().includes(q),
				)
			: followed;
		const sorted = [...filtered].sort((a, b) =>
			a.name.localeCompare(b.name, "pt-BR"),
		);
		return [{ slug: null, name: "Nenhuma" }, ...sorted];
	}, [query, followed]);

	// Re-anchor the highlight when the option set changes — drop it back to 0
	// so the first match is always selectable with Enter.
	useEffect(() => {
		setHighlight(0);
	}, [query, followed.length]);

	// Focus the input when the popup opens so the user can type immediately.
	useEffect(() => {
		if (open) {
			requestAnimationFrame(() => inputRef.current?.focus());
		} else {
			setQuery("");
		}
	}, [open]);

	// Click-outside to close. The AppHeader dropdown has its own backdrop;
	// we still need one here because clicking on the combobox shouldn't
	// immediately close the outer dropdown via its backdrop.
	useEffect(() => {
		if (!open) return;
		const onDocClick = (e: MouseEvent) => {
			if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, [open]);

	function pick(slug: string | null) {
		setActive(slug);
		setOpen(false);
		onPick?.();
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlight((h) => Math.min(h + 1, options.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlight((h) => Math.max(h - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			const opt = options[highlight];
			if (opt) pick(opt.slug);
		} else if (e.key === "Escape") {
			e.preventDefault();
			setOpen(false);
		}
	}

	if (!username) return null;

	return (
		<div className="relative" data-testid="active-community-selector">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="listbox"
				aria-expanded={open}
				data-testid="active-community-select"
				data-active-slug={active ?? ""}
				className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-700 dark:text-slate-200 hover:border-brand transition"
			>
				<span className="flex flex-col items-start min-w-0">
					<span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
						Comunidade ativa
					</span>
					<span className="truncate max-w-[140px]">
						{activeName ?? "Nenhuma"}
					</span>
				</span>
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="flex-shrink-0 text-slate-400"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</button>

			{open && (
				<div
					ref={popupRef}
					className="absolute left-0 right-0 top-[calc(100%+4px)] z-[60] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden"
				>
					<div className="p-2 border-b border-slate-100 dark:border-slate-800">
						<input
							ref={inputRef}
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={onKeyDown}
							placeholder="Buscar comunidade…"
							aria-label="Buscar comunidade"
							role="combobox"
							aria-controls={listboxId}
							aria-expanded={open}
							aria-autocomplete="list"
							aria-activedescendant={
								options[highlight]
									? optionId(options[highlight].slug)
									: undefined
							}
							data-testid="active-community-search"
							className="w-full px-2.5 py-1.5 rounded-md text-[13px] border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand"
						/>
					</div>
					<ul
						id={listboxId}
						role="listbox"
						className="max-h-60 overflow-y-auto py-1"
					>
						{options.length === 1 && query.trim() !== "" && (
							<li className="px-3 py-2 text-[12px] text-slate-400 dark:text-slate-500">
								Nenhuma correspondência.
							</li>
						)}
						{options.map((opt, i) => {
							const selected = (opt.slug ?? "") === (active ?? "");
							const isHighlighted = i === highlight;
							return (
								<li
									key={opt.slug ?? "__none__"}
									id={optionId(opt.slug)}
									role="option"
									aria-selected={selected}
									data-testid={`active-community-option-${opt.slug ?? "none"}`}
									onMouseEnter={() => setHighlight(i)}
									onClick={() => pick(opt.slug)}
									className={`px-3 py-1.5 text-[13px] cursor-pointer flex items-center justify-between gap-2 ${
										isHighlighted
											? "bg-brand/10 text-brand"
											: "text-slate-700 dark:text-slate-200"
									} ${selected ? "font-semibold" : ""}`}
								>
									<span className="truncate">{opt.name}</span>
									{selected && (
										<svg
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="3"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="flex-shrink-0"
										>
											<polyline points="20 6 9 17 4 12" />
										</svg>
									)}
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}
