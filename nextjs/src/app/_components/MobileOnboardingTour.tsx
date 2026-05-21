"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { PushToggle } from "@/components/PushToggle";

/**
 * First-launch tour shown once when the app is opened as an installed
 * TWA/PWA (display-mode: standalone). Three slides introduce the
 * mobile-specific value: what the app is, push notifications (with the
 * real opt-in inline), and the daily reading habit. A regular browser
 * tab never sees it.
 *
 * The "seen" flag is versioned so a future tour revision can re-show
 * without colliding with this one.
 */
const SEEN_KEY = "bc:onboarding-twa-v1-seen";

function isStandalone(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return false;
	}
	return window.matchMedia("(display-mode: standalone)").matches;
}

interface Slide {
	emoji: string;
	title: string;
	body: string;
}

const SLIDES: Slide[] = [
	{
		emoji: "📖",
		title: "Bem-vindo ao Bible Comment",
		body: "Leia a Bíblia, comente versículo por versículo e discuta as Escrituras junto a uma comunidade — agora no seu celular.",
	},
	{
		emoji: "🔔",
		title: "Fique por dentro",
		body: "Receba um aviso quando responderem seu comentário, te mencionarem, começarem a te seguir ou você desbloquear uma conquista.",
	},
	{
		emoji: "🔥",
		title: "Crie o hábito",
		body: "Ative um lembrete diário com o capítulo de hoje e acompanhe sua sequência de dias lendo a Bíblia.",
	},
];

export function MobileOnboardingTour() {
	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);

	useEffect(() => {
		if (!isStandalone()) return;
		try {
			if (window.localStorage.getItem(SEEN_KEY) === "1") return;
		} catch {
			return; // private mode — don't risk an un-dismissable modal
		}
		setOpen(true);
	}, []);

	function finish() {
		try {
			window.localStorage.setItem(SEEN_KEY, "1");
		} catch {
			// degrade silently — worst case the tour shows again next launch
		}
		setOpen(false);
	}

	if (!open) return null;

	const slide = SLIDES[index];
	const isLast = index === SLIDES.length - 1;

	return (
		<Modal
			show={open}
			onClose={finish}
			size="sm"
			ariaLabel="Tour de boas-vindas"
		>
			<div className="flex flex-col items-center text-center" data-testid="onboarding-tour">
				<div className="flex justify-end w-full">
					<button
						type="button"
						onClick={finish}
						data-testid="onboarding-skip"
						className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-none cursor-pointer"
					>
						Pular
					</button>
				</div>

				<div aria-hidden="true" className="text-5xl mt-1 mb-3">
					{slide.emoji}
				</div>
				<h2 className="font-lora text-xl font-bold text-slate-800 dark:text-slate-100 m-0">
					{slide.title}
				</h2>
				<p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2 mb-4">
					{slide.body}
				</p>

				{/* Slide 2: real push opt-in inline. */}
				{index === 1 && (
					<div className="mb-4">
						<PushToggle />
					</div>
				)}

				{/* Slide 3: deep link to set the reminder up. */}
				{index === 2 && (
					<Link
						href="/profile"
						onClick={finish}
						className="mb-4 inline-flex items-center justify-center h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-semibold transition-colors"
					>
						Configurar lembrete
					</Link>
				)}

				{/* Progress dots */}
				<div className="flex gap-1.5 mb-4" aria-hidden="true">
					{SLIDES.map((_, i) => (
						<span
							key={i}
							className={`w-1.5 h-1.5 rounded-full ${
								i === index
									? "bg-brand"
									: "bg-slate-300 dark:bg-slate-600"
							}`}
						/>
					))}
				</div>

				<div className="flex items-center justify-between w-full gap-3">
					<button
						type="button"
						onClick={() => setIndex((i) => Math.max(0, i - 1))}
						disabled={index === 0}
						className="text-[13px] font-medium text-slate-500 dark:text-slate-400 bg-transparent border-none cursor-pointer disabled:opacity-0 disabled:cursor-default"
					>
						Voltar
					</button>
					<button
						type="button"
						data-testid="onboarding-next"
						onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
						className="flex-1 max-w-[160px] h-10 rounded-lg bg-brand text-white text-sm font-semibold cursor-pointer hover:opacity-90 transition"
					>
						{isLast ? "Começar" : "Próximo"}
					</button>
				</div>
			</div>
		</Modal>
	);
}
