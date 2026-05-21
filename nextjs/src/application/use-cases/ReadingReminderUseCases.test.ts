import { describe, it, expect, vi } from "vitest";
import {
	GetReadingReminderUseCase,
	UpdateReadingReminderUseCase,
} from "./ReadingReminderUseCases";
import type { IReadingReminderPreferenceRepository } from "@/domain/repositories/IReadingReminderPreferenceRepository";
import {
	DEFAULT_REMINDER_HOUR,
	DEFAULT_REMINDER_TZ,
	type ReadingReminderPreference,
} from "@/domain/entities/ReadingReminderPreference";

function makeRepo(
	overrides: Partial<IReadingReminderPreferenceRepository> = {},
): IReadingReminderPreferenceRepository {
	return {
		findByUsername: vi.fn().mockResolvedValue(null),
		upsert: vi.fn().mockResolvedValue({} as ReadingReminderPreference),
		findAllEnabled: vi.fn().mockResolvedValue([]),
		markSent: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("GetReadingReminderUseCase", () => {
	it("returns the stored preference when one exists", async () => {
		const stored: ReadingReminderPreference = {
			username: "alice",
			enabled: true,
			hourLocal: 7.5,
			tz: "America/Sao_Paulo",
		};
		const repo = makeRepo({
			findByUsername: vi.fn().mockResolvedValue(stored),
		});
		const useCase = new GetReadingReminderUseCase(repo);
		const result = await useCase.execute("alice");
		expect(result).toEqual(stored);
	});

	it("returns a disabled default for users who never opted in", async () => {
		const repo = makeRepo();
		const useCase = new GetReadingReminderUseCase(repo);
		const result = await useCase.execute("ghost");
		expect(result).toEqual({
			username: "ghost",
			enabled: false,
			hourLocal: DEFAULT_REMINDER_HOUR,
			tz: DEFAULT_REMINDER_TZ,
		});
	});
});

describe("UpdateReadingReminderUseCase", () => {
	it("upserts the preference with the provided fields", async () => {
		const upsert = vi.fn().mockImplementation(async (p) => p);
		const repo = makeRepo({ upsert });
		const useCase = new UpdateReadingReminderUseCase(repo);

		await useCase.execute({
			username: "alice",
			enabled: true,
			hourLocal: 7.5,
			tz: "America/Sao_Paulo",
		});

		expect(upsert).toHaveBeenCalledWith({
			username: "alice",
			enabled: true,
			hourLocal: 7.5,
			tz: "America/Sao_Paulo",
		});
	});

	it("defaults tz to America/Sao_Paulo when omitted", async () => {
		const upsert = vi.fn().mockImplementation(async (p) => p);
		const repo = makeRepo({ upsert });
		const useCase = new UpdateReadingReminderUseCase(repo);

		await useCase.execute({ username: "alice", enabled: true, hourLocal: 8 });

		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({ tz: "America/Sao_Paulo" }),
		);
	});

	it("rejects hourLocal outside [0, 23.5]", async () => {
		const useCase = new UpdateReadingReminderUseCase(makeRepo());
		await expect(
			useCase.execute({ username: "alice", enabled: true, hourLocal: 24 }),
		).rejects.toThrow(/hourLocal/);
		await expect(
			useCase.execute({ username: "alice", enabled: true, hourLocal: -1 }),
		).rejects.toThrow(/hourLocal/);
	});

	it("rejects hourLocal off the half-hour grid", async () => {
		const useCase = new UpdateReadingReminderUseCase(makeRepo());
		await expect(
			useCase.execute({ username: "alice", enabled: true, hourLocal: 7.25 }),
		).rejects.toThrow(/half-hour|multiple/i);
	});

	it("accepts the boundary values 0 and 23.5", async () => {
		const useCase = new UpdateReadingReminderUseCase(makeRepo());
		await expect(
			useCase.execute({ username: "alice", enabled: true, hourLocal: 0 }),
		).resolves.toBeDefined();
		await expect(
			useCase.execute({ username: "alice", enabled: true, hourLocal: 23.5 }),
		).resolves.toBeDefined();
	});
});
