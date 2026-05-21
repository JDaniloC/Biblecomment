import { describe, it, expect, vi } from "vitest";
import { SendDailyRemindersUseCase } from "./SendDailyRemindersUseCase";
import type { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import type { PushNotificationService } from "@/application/services/PushNotificationService";
import type { ReadingReminderPreference } from "@/domain/entities/ReadingReminderPreference";

const SP = "America/Sao_Paulo";
// 2026-05-21 11:00 UTC == 08:00 in São Paulo → half-hour slot 8.
const NOW = new Date("2026-05-21T11:00:00Z");

function pref(
	over: Partial<ReadingReminderPreference> = {},
): ReadingReminderPreference {
	return {
		username: "alice",
		enabled: true,
		hourLocal: 8,
		tz: SP,
		...over,
	};
}

function makeDeps(prefs: ReadingReminderPreference[]) {
	const markSent = vi.fn().mockResolvedValue(undefined);
	const sendToUser = vi.fn().mockResolvedValue(undefined);
	const reminders = {
		findByUsername: vi.fn(),
		upsert: vi.fn(),
		findAllEnabled: vi.fn().mockResolvedValue(prefs),
		markSent,
	} as unknown as IReadingReminderPreferenceRepository;
	const push = { sendToUser } as unknown as PushNotificationService;
	return { reminders, push, markSent, sendToUser };
}

describe("SendDailyRemindersUseCase", () => {
	it("sends to a user whose slot matches and was never sent before", async () => {
		const { reminders, push, markSent, sendToUser } = makeDeps([pref()]);
		const useCase = new SendDailyRemindersUseCase(reminders, push);

		const result = await useCase.execute({ now: NOW });

		expect(result).toEqual({ processed: 1, sent: 1, skipped: 0 });
		expect(sendToUser).toHaveBeenCalledOnce();
		expect(markSent).toHaveBeenCalledWith("alice", NOW);
	});

	it("includes today's RPSP chapter in the push payload", async () => {
		const { reminders, push, sendToUser } = makeDeps([pref()]);
		const useCase = new SendDailyRemindersUseCase(reminders, push);

		await useCase.execute({ now: NOW });

		const [username, payload] = sendToUser.mock.calls[0];
		expect(username).toBe("alice");
		expect(payload.title).toBe("Leitura de hoje");
		expect(payload.url).toMatch(/^\/verses\/[a-z0-9]+\/\d+$/);
		expect(payload.tag).toBe("reading-reminder");
		expect(payload.body).toMatch(/Dia \d+ de 1189/);
	});

	it("skips a user whose slot does not match the current time", async () => {
		const { reminders, push, sendToUser, markSent } = makeDeps([
			pref({ hourLocal: 15 }),
		]);
		const useCase = new SendDailyRemindersUseCase(reminders, push);

		const result = await useCase.execute({ now: NOW });

		expect(result).toEqual({ processed: 1, sent: 0, skipped: 1 });
		expect(sendToUser).not.toHaveBeenCalled();
		expect(markSent).not.toHaveBeenCalled();
	});

	it("skips a user who already received today's reminder", async () => {
		const earlierToday = new Date("2026-05-21T10:31:00Z"); // 07:31 SP, same date
		const { reminders, push, sendToUser } = makeDeps([
			pref({ lastSentAt: earlierToday }),
		]);
		const useCase = new SendDailyRemindersUseCase(reminders, push);

		const result = await useCase.execute({ now: NOW });

		expect(result.sent).toBe(0);
		expect(result.skipped).toBe(1);
		expect(sendToUser).not.toHaveBeenCalled();
	});

	it("resends when the last send was on a previous day", async () => {
		const yesterday = new Date("2026-05-20T11:00:00Z");
		const { reminders, push, sendToUser } = makeDeps([
			pref({ lastSentAt: yesterday }),
		]);
		const useCase = new SendDailyRemindersUseCase(reminders, push);

		const result = await useCase.execute({ now: NOW });

		expect(result.sent).toBe(1);
		expect(sendToUser).toHaveBeenCalledOnce();
	});

	it("handles a mixed batch — partitions sent vs skipped", async () => {
		const { reminders, push, sendToUser } = makeDeps([
			pref({ username: "alice", hourLocal: 8 }), // match
			pref({ username: "bob", hourLocal: 20 }), // no match
			pref({
				username: "carol",
				hourLocal: 8,
				lastSentAt: new Date("2026-05-21T10:45:00Z"), // already today
			}),
		]);
		const useCase = new SendDailyRemindersUseCase(reminders, push);

		const result = await useCase.execute({ now: NOW });

		expect(result).toEqual({ processed: 3, sent: 1, skipped: 2 });
		expect(sendToUser).toHaveBeenCalledOnce();
		expect(sendToUser.mock.calls[0][0]).toBe("alice");
	});

	it("returns an all-zero result when nobody is opted in", async () => {
		const { reminders, push } = makeDeps([]);
		const useCase = new SendDailyRemindersUseCase(reminders, push);

		const result = await useCase.execute({ now: NOW });

		expect(result).toEqual({ processed: 0, sent: 0, skipped: 0 });
	});
});
