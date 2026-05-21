import { describe, it, expect } from "vitest";
import {
	currentHalfHourSlotInTz,
	localDateString,
	matchesCurrentSlot,
	shouldSendNow,
} from "./reminder-scheduler";

// Brazil is UTC-3 year-round (no DST since 2019), so the math is stable.
const SP = "America/Sao_Paulo";

describe("currentHalfHourSlotInTz", () => {
	it("returns the on-the-hour slot before minute 30", () => {
		// 2026-05-21 11:15 UTC == 08:15 in SP → slot 8
		const now = new Date("2026-05-21T11:15:00Z");
		expect(currentHalfHourSlotInTz(now, SP)).toBe(8);
	});

	it("returns the half-past slot at and after minute 30", () => {
		const now = new Date("2026-05-21T11:30:00Z"); // 08:30 SP
		expect(currentHalfHourSlotInTz(now, SP)).toBe(8.5);
		const now2 = new Date("2026-05-21T11:45:00Z"); // 08:45 SP
		expect(currentHalfHourSlotInTz(now2, SP)).toBe(8.5);
	});

	it("handles tz wrap into the previous day", () => {
		// 2026-05-21 01:30 UTC == 22:30 the day before in SP → slot 22.5
		const now = new Date("2026-05-21T01:30:00Z");
		expect(currentHalfHourSlotInTz(now, SP)).toBe(22.5);
	});

	it("rounds 11:00 SP correctly (boundary)", () => {
		const now = new Date("2026-05-21T14:00:00Z"); // 11:00 SP
		expect(currentHalfHourSlotInTz(now, SP)).toBe(11);
	});

	it("matches Europe/Paris during summer", () => {
		// 2026-07-15 06:00 UTC == 08:00 in Paris (CEST = UTC+2) → slot 8
		const now = new Date("2026-07-15T06:00:00Z");
		expect(currentHalfHourSlotInTz(now, "Europe/Paris")).toBe(8);
	});
});

describe("localDateString", () => {
	it("formats YYYY-MM-DD in the requested tz", () => {
		// 2026-05-21 02:00 UTC == 23:00 the day before in SP
		const d = new Date("2026-05-21T02:00:00Z");
		expect(localDateString(d, SP)).toBe("2026-05-20");
		expect(localDateString(d, "UTC")).toBe("2026-05-21");
	});
});

describe("matchesCurrentSlot", () => {
	const now = new Date("2026-05-21T11:00:00Z"); // 08:00 SP → slot 8

	it("matches when hourLocal equals the current slot", () => {
		expect(matchesCurrentSlot(now, SP, 8)).toBe(true);
	});

	it("matches when hourLocal equals the previous slot (jitter window)", () => {
		expect(matchesCurrentSlot(now, SP, 7.5)).toBe(true);
	});

	it("does not match other slots", () => {
		expect(matchesCurrentSlot(now, SP, 7)).toBe(false);
		expect(matchesCurrentSlot(now, SP, 8.5)).toBe(false);
		expect(matchesCurrentSlot(now, SP, 9)).toBe(false);
	});

	it("wraps the previous slot around midnight", () => {
		// 03:00 UTC == 00:00 SP → slot 0; previous = 23.5
		const midnight = new Date("2026-05-21T03:00:00Z");
		expect(matchesCurrentSlot(midnight, SP, 23.5)).toBe(true);
		expect(matchesCurrentSlot(midnight, SP, 0)).toBe(true);
	});
});

describe("shouldSendNow", () => {
	const now = new Date("2026-05-21T11:00:00Z"); // 08:00 SP

	it("sends when the slot matches and there is no prior send", () => {
		expect(
			shouldSendNow({ now, tz: SP, hourLocal: 8, lastSentAt: null }),
		).toBe(true);
	});

	it("sends when the last send was on a previous calendar day in tz", () => {
		const yesterday = new Date("2026-05-20T11:00:00Z");
		expect(
			shouldSendNow({ now, tz: SP, hourLocal: 8, lastSentAt: yesterday }),
		).toBe(true);
	});

	it("skips when the last send is on today's date in tz (deduplication)", () => {
		const earlierToday = new Date("2026-05-21T10:30:00Z"); // 07:30 SP, same date
		expect(
			shouldSendNow({ now, tz: SP, hourLocal: 8, lastSentAt: earlierToday }),
		).toBe(false);
	});

	it("skips when the slot doesn't match (regardless of lastSentAt)", () => {
		expect(
			shouldSendNow({ now, tz: SP, hourLocal: 10, lastSentAt: null }),
		).toBe(false);
	});

	it("does not double-send across the jitter window", () => {
		const jitterTime = new Date("2026-05-21T11:32:00Z"); // 08:32 SP, slot 8.5, prev 8
		const sentAt = new Date("2026-05-21T11:01:00Z"); // 08:01 SP, just sent for slot 8
		expect(
			shouldSendNow({
				now: jitterTime,
				tz: SP,
				hourLocal: 8,
				lastSentAt: sentAt,
			}),
		).toBe(false);
	});
});
