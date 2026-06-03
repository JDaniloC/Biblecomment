import { describe, it, expect } from "vitest";
import { formatRelativeDate } from "./relative-date";

const NOW = new Date("2026-06-02T12:00:00Z").getTime();

describe("formatRelativeDate", () => {
	it("returns 'agora' for under a minute", () => {
		expect(formatRelativeDate(new Date(NOW - 30 * 1000), NOW)).toBe("agora");
	});
	it("returns minutes for under an hour", () => {
		expect(formatRelativeDate(new Date(NOW - 5 * 60 * 1000), NOW)).toBe(
			"há 5 min",
		);
	});
	it("returns hours for under a day", () => {
		expect(formatRelativeDate(new Date(NOW - 3 * 60 * 60 * 1000), NOW)).toBe(
			"há 3 h",
		);
	});
	it("returns singular day at exactly one day", () => {
		expect(
			formatRelativeDate(new Date(NOW - 24 * 60 * 60 * 1000), NOW),
		).toBe("há 1 dia");
	});
	it("returns plural days under 30 days", () => {
		expect(
			formatRelativeDate(new Date(NOW - 2 * 24 * 60 * 60 * 1000), NOW),
		).toBe("há 2 dias");
	});
	it("accepts ISO strings", () => {
		expect(
			formatRelativeDate(new Date(NOW - 5 * 60 * 1000).toISOString(), NOW),
		).toBe("há 5 min");
	});
	it("returns empty string for invalid input", () => {
		expect(formatRelativeDate("not-a-date", NOW)).toBe("");
	});
	it("falls back to an absolute dd/mm/yyyy past 30 days", () => {
		const old = new Date(2026, 0, 1); // local Jan 1 2026
		const now = new Date(2026, 5, 2).getTime(); // local Jun 2 2026 (>30 days later)
		expect(formatRelativeDate(old, now)).toBe("01/01/2026");
	});
});
