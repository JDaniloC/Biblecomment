import { describe, it, expect } from "vitest";
import { computeStreak } from "./reading-streak";

const SP = "America/Sao_Paulo";
// 2026-05-21 15:00 UTC == 12:00 in São Paulo — comfortably mid-day so
// the -24h "yesterday" math never lands on a tz boundary.
const NOW = new Date("2026-05-21T15:00:00Z");

/** Build a readAt timestamp for a given BRT calendar day at noon. */
function brtNoon(ymd: string): Date {
	// Noon BRT == 15:00 UTC.
	return new Date(`${ymd}T15:00:00Z`);
}

describe("computeStreak", () => {
	it("returns a zero streak when there are no reads", () => {
		expect(computeStreak([], NOW, SP)).toEqual({
			current: 0,
			readToday: false,
			atRisk: false,
		});
	});

	it("counts a single read today as a 1-day streak", () => {
		const result = computeStreak([brtNoon("2026-05-21")], NOW, SP);
		expect(result).toEqual({ current: 1, readToday: true, atRisk: false });
	});

	it("counts consecutive days ending today", () => {
		const reads = ["2026-05-19", "2026-05-20", "2026-05-21"].map(brtNoon);
		const result = computeStreak(reads, NOW, SP);
		expect(result).toEqual({ current: 3, readToday: true, atRisk: false });
	});

	it("keeps the streak alive (at risk) when yesterday was read but today wasn't", () => {
		const reads = ["2026-05-19", "2026-05-20"].map(brtNoon);
		const result = computeStreak(reads, NOW, SP);
		expect(result).toEqual({ current: 2, readToday: false, atRisk: true });
	});

	it("resets to zero when the last read was 2+ days ago", () => {
		const reads = ["2026-05-18", "2026-05-19"].map(brtNoon);
		const result = computeStreak(reads, NOW, SP);
		expect(result).toEqual({ current: 0, readToday: false, atRisk: false });
	});

	it("stops counting at the first gap", () => {
		// Read today, yesterday, then a gap, then older days.
		const reads = [
			"2026-05-21",
			"2026-05-20",
			"2026-05-18",
			"2026-05-17",
		].map(brtNoon);
		const result = computeStreak(reads, NOW, SP);
		expect(result.current).toBe(2); // only 20th + 21st
		expect(result.readToday).toBe(true);
	});

	it("deduplicates multiple reads on the same day", () => {
		// Three chapters read today + one yesterday → 2-day streak, not 4.
		const reads = [
			new Date("2026-05-21T13:00:00Z"),
			new Date("2026-05-21T14:00:00Z"),
			new Date("2026-05-21T18:00:00Z"),
			brtNoon("2026-05-20"),
		];
		const result = computeStreak(reads, NOW, SP);
		expect(result.current).toBe(2);
	});

	it("uses the reader's timezone for the day boundary", () => {
		// 2026-05-21 02:00 UTC == 23:00 on 2026-05-20 in São Paulo.
		const lateNightRead = new Date("2026-05-21T02:00:00Z");
		// Evaluated at midday on the 21st BRT → that read counts as the 20th,
		// so the streak is alive-but-at-risk, not "read today".
		const result = computeStreak([lateNightRead], NOW, SP);
		expect(result).toEqual({ current: 1, readToday: false, atRisk: true });
	});
});
