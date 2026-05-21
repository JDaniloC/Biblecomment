import Link from "next/link";
import type { ReadingStreak } from "@/lib/reading-streak";

/**
 * Home banner showing the reader's consecutive-days streak. Three
 * states: celebrate (read today), nudge (streak alive but today
 * pending), and invite (no streak yet). The CTA points at today's RPSP
 * chapter so a single tap keeps or starts the run.
 */
export function ReadingStreakCard({
	streak,
	todayReadingUrl,
	todayReadingLabel,
}: {
	streak: ReadingStreak;
	todayReadingUrl: string;
	todayReadingLabel: string;
}) {
	const { current, readToday, atRisk } = streak;

	const headline =
		current === 0
			? "Comece sua sequência de leitura"
			: `${current} ${current === 1 ? "dia" : "dias"} de leitura seguidos`;

	const subtext = readToday
		? "Você já leu hoje. Continue firme amanhã!"
		: atRisk
			? "Leia um capítulo hoje para não perder a sequência."
			: "Leia o capítulo de hoje e comece a contar.";

	return (
		<section
			data-testid="reading-streak-card"
			data-streak={current}
			data-read-today={readToday ? "true" : "false"}
			className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 px-5 py-4"
		>
			<div
				aria-hidden="true"
				className="shrink-0 text-3xl leading-none"
			>
				{readToday ? "🔥" : "📖"}
			</div>
			<div className="flex-1 min-w-0">
				<div className="font-bold text-[15px] text-orange-900 dark:text-orange-200">
					{headline}
				</div>
				<div className="text-[13px] text-orange-800/80 dark:text-orange-300/80">
					{subtext}
				</div>
			</div>
			{!readToday && (
				<Link
					href={todayReadingUrl}
					className="shrink-0 inline-flex items-center justify-center h-[36px] px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-semibold transition-colors whitespace-nowrap"
				>
					Ler {todayReadingLabel}
				</Link>
			)}
		</section>
	);
}
