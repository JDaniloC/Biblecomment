"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { Toggle } from "./Toggle";

/**
 * Opt-in to features still being tested, on this device only (localStorage
 * `bc:experimental`). Today it lets the cloned voices narrate the chapters they
 * have; nothing else on the page changes.
 */
export function ExperimentalModeCard() {
	const { experimentalMode, setExperimentalMode } = useAudioPlayer();

	return (
		<div
			data-testid="experimental-mode-card"
			className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-5"
		>
			<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">
				Modo experimental
			</div>
			<p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
				Recursos ainda em teste. Vale só para este aparelho.
			</p>

			<div className="flex items-start gap-3.5">
				<Toggle
					checked={experimentalMode}
					onChange={setExperimentalMode}
					ariaLabel="Ativar modo experimental"
					dataTestid="experimental-mode-toggle"
				/>
				<div>
					<div className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 leading-[19.5px]">
						Vozes experimentais na narração
					</div>
					<div className="text-xs text-slate-400 dark:text-slate-500 leading-[18px] mt-0.5">
						Nos livros que já têm uma voz em teste, o áudio toca com ela no lugar
						do narrador de sempre.
					</div>
				</div>
			</div>
		</div>
	);
}
