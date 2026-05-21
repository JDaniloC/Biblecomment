import { describe, it, expect } from "vitest";
import { computeStreak, daysFromTimestamps } from "./reading-streak";

const SP = "America/Sao_Paulo";
// 2026-05-21 15:00 UTC == 12:00 in São Paulo — mid-day, away from any
// tz boundary so the -24h "yesterday" math is unambiguous.
const NOW = new Date("2026-05-21T15:00:00Z");

function days(...ymd: string[]): Set<string> {
	return new Set(ymd);
}

describe("daysFromTimestamps", () => {
	it("maps timestamps to their BRT calendar day", () => {
		const result = daysFromTimestamps(
			[
				new Date("2026-05-21T15:00:00Z"), // 12:00 BRT → 21st
				new Date("2026-05-21T02:00:00Z"), // 23:00 BRT → 20th
			],
			SP,
		);
		expect(result).toEqual(["2026-05-21", "2026-05-20"]);
	});
});

describe("computeStreak", () => {
	it("returns a zero streak for an empty day set", () => {
		expect(computeStreak(days(), NOW, SP)).toEqual({
			current: 0,
			readToday: false,
			atRisk: false,
		});
	});

	it("counts engagement today as a 1-day streak", () => {
		expect(computeStreak(days("2026-05-21"), NOW, SP)).toEqual({
			current: 1,
			readToday: true,
			atRisk: false,
		});
	});

	it("counts consecutive days ending today", () => {
		const result = computeStreak(
			days("2026-05-19", "2026-05-20", "2026-05-21"),
			NOW,
			SP,
		);
		expect(result).toEqual({ current: 3, readToday: true, atRisk: false });
	});

	it("keeps the streak alive (at risk) when yesterday counted but today hasn't", () => {
		const result = computeStreak(days("2026-05-19", "2026-05-20"), NOW, SP);
		expect(result).toEqual({ current: 2, readToday: false, atRisk: true });
	});

	it("resets to zero when the last engaged day was 2+ days ago", () => {
		const result = computeStreak(days("2026-05-18", "2026-05-19"), NOW, SP);
		expect(result).toEqual({ current: 0, readToday: false, atRisk: false });
	});

	it("stops counting at the first gap", () => {
		const result = computeStreak(
			days("2026-05-21", "2026-05-20", "2026-05-18", "2026-05-17"),
			NOW,
			SP,
		);
		expect(result.current).toBe(2);
		expect(result.readToday).toBe(true);
	});
});
