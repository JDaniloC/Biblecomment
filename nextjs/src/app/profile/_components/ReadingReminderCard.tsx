"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useNotification } from "@/contexts/NotificationContext";
import {
	DEFAULT_REMINDER_HOUR,
	DEFAULT_REMINDER_TZ,
	type ReadingReminderPreference,
} from "@/domain/entities/ReadingReminderPreference";

/** "07:30" for 7.5, "00:00" for 0, "23:30" for 23.5. */
function formatHourLocal(h: number): string {
	const hh = Math.floor(h);
	const mm = (h * 2) % 2 === 0 ? "00" : "30";
	return `${hh.toString().padStart(2, "0")}:${mm}`;
}

/** Half-hour grid 00:00..23:30 (48 slots). */
const SLOTS = Array.from({ length: 48 }, (_, i) => i / 2);

export function ReadingReminderCard() {
	const { handleNotification } = useNotification();
	const [enabled, setEnabled] = useState(false);
	const [hourLocal, setHourLocal] = useState<number>(DEFAULT_REMINDER_HOUR);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await axios.get<ReadingReminderPreference>(
					"/api/me/reading-reminder",
				);
				if (cancelled) return;
				setEnabled(res.data.enabled);
				setHourLocal(res.data.hourLocal);
			} catch {
				// Anonymous / 401 — leave defaults; UI is gated by the parent anyway.
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	async function save() {
		setSaving(true);
		try {
			await axios.put("/api/me/reading-reminder", {
				enabled,
				hourLocal,
				tz: DEFAULT_REMINDER_TZ,
			});
			handleNotification(
				"success",
				enabled
					? `Lembrete diário ativado às ${formatHourLocal(hourLocal)}.`
					: "Lembrete diário desativado.",
			);
		} catch {
			handleNotification("error", "Erro ao salvar lembrete.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div
			data-testid="reading-reminder-card"
			className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-5"
		>
			<div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">
				Lembrete diário de leitura
			</div>
			<p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
				Receba uma notificação no horário que escolher com o capítulo de hoje
				do plano Reavivados Por Sua Palavra. As notificações por push precisam
				estar ativadas no sino.
			</p>

			<label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
				<input
					type="checkbox"
					data-testid="reading-reminder-enabled"
					checked={enabled}
					onChange={(e) => setEnabled(e.target.checked)}
					disabled={loading}
					className="w-4 h-4 accent-brand cursor-pointer"
				/>
				<span className="text-[13px] text-slate-800 dark:text-slate-100">
					Ativar lembrete
				</span>
			</label>

			<div
				className={`flex flex-col gap-1.5 mb-5 transition-opacity ${
					enabled ? "opacity-100" : "opacity-50"
				}`}
			>
				<label
					htmlFor="reminder-hour"
					className="font-semibold text-[13px] text-slate-800 dark:text-slate-100"
				>
					Horário (fuso de São Paulo)
				</label>
				<select
					id="reminder-hour"
					data-testid="reading-reminder-hour"
					value={hourLocal}
					onChange={(e) => setHourLocal(Number(e.target.value))}
					disabled={loading || !enabled}
					className="w-full max-w-[160px] h-[38.833px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-[13px] text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none cursor-pointer disabled:cursor-not-allowed"
				>
					{SLOTS.map((slot) => (
						<option key={slot} value={slot}>
							{formatHourLocal(slot)}
						</option>
					))}
				</select>
			</div>

			<button
				onClick={save}
				disabled={loading || saving}
				className="h-[35.5px] px-5 bg-brand text-white rounded-[7px] text-[13px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
			>
				{saving ? "Salvando…" : "Salvar lembrete"}
			</button>
		</div>
	);
}
