"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import {
	addReadingSeconds,
	brtDayKey,
	hasPostedSession,
	markSessionPosted,
	READING_SESSION_THRESHOLD_SECONDS,
} from "@/lib/reading-time";

/** How often the tracker accrues time, in ms. */
const TICK_MS = 15_000;

/**
 * Accrues active reading time while the user sits on a chapter page and,
 * once the daily threshold is crossed, registers a reading session
 * exactly once. Time is banked in localStorage keyed by the BRT day, so
 * it survives chapter-to-chapter navigation within the same day.
 *
 * Pass `enabled` false for anonymous viewers — there's no account to
 * attribute the session to.
 */
export function useReadingTime(enabled: boolean): void {
	// Guards against a double POST between the optimistic flag flip and the
	// request settling.
	const postingRef = useRef(false);

	useEffect(() => {
		if (!enabled || typeof window === "undefined") return;

		const day = brtDayKey();
		if (hasPostedSession(day)) return;

		const id = window.setInterval(() => {
			// Hidden/background tabs don't count — only real reading time.
			if (document.visibilityState !== "visible") return;

			const total = addReadingSeconds(TICK_MS / 1000, day);
			if (
				!postingRef.current &&
				!hasPostedSession(day) &&
				total >= READING_SESSION_THRESHOLD_SECONDS
			) {
				postingRef.current = true;
				axios
					.post("/api/me/reading-session")
					.then(() => markSessionPosted(day))
					.catch(() => {
						// Network hiccup — let the next tick retry.
						postingRef.current = false;
					});
			}
		}, TICK_MS);

		return () => window.clearInterval(id);
	}, [enabled]);
}
