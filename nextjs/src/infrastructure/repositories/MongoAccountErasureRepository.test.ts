import { describe, it, expect, vi, beforeEach } from "vitest";
import { BackupErasuresSchema } from "@/lib/schemas";

const mocks = vi.hoisted(() => {
	const order: string[] = [];
	return {
		order,
		bulkWrite: vi.fn(async (..._args: unknown[]) => {
			order.push("bulkWrite");
			return { upsertedCount: 1 };
		}),
		info: vi.fn((..._args: unknown[]) => {
			order.push("logger.info");
		}),
	};
});

vi.mock("@/infrastructure/database/connection", () => ({
	connectToDatabase: vi.fn(async () => undefined),
}));
vi.mock("@/infrastructure/database/models/AccountErasureModel", () => ({
	AccountErasureModel: { bulkWrite: mocks.bulkWrite },
}));
vi.mock("@/lib/logger", () => ({
	logger: { info: mocks.info, warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { MongoAccountErasureRepository } from "./MongoAccountErasureRepository";

const USER_ID = "65a1b2c3d4e5f60718293a4b";
const AT = new Date("2026-10-01T12:34:56.000Z");

describe("MongoAccountErasureRepository.record", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.order.length = 0;
	});

	it("upserts the tombstone, then logs it with only the id and the date", async () => {
		await new MongoAccountErasureRepository().record(USER_ID, AT);

		expect(mocks.bulkWrite).toHaveBeenCalledTimes(1);
		expect(mocks.info).toHaveBeenCalledTimes(1);
		expect(mocks.info).toHaveBeenCalledWith(
			{ action: "account_erased", userId: USER_ID, erasedAt: "2026-10-01T12:34:56.000Z" },
			"account erasure recorded",
		);
		expect(mocks.order).toEqual(["bulkWrite", "logger.info"]);
	});

	it("logs an entry that /api/backup/erasures accepts as is", async () => {
		await new MongoAccountErasureRepository().record(USER_ID, AT);

		const [entry] = mocks.info.mock.calls[0] as [{ userId: string; erasedAt: string }];
		const parsed = BackupErasuresSchema.safeParse([
			{ userId: entry.userId, erasedAt: entry.erasedAt },
		]);
		expect(parsed.success).toBe(true);
		expect(parsed.data?.erasures).toEqual([{ userId: USER_ID, erasedAt: AT }]);
	});

	it("does not log when the upsert fails", async () => {
		mocks.bulkWrite.mockRejectedValueOnce(new Error("Atlas timeout"));

		await expect(new MongoAccountErasureRepository().record(USER_ID, AT)).rejects.toThrow(
			"Atlas timeout",
		);
		expect(mocks.info).not.toHaveBeenCalled();
	});

	it("neither writes nor logs an id that can't name an account", async () => {
		await new MongoAccountErasureRepository().record("not-an-object-id", AT);

		expect(mocks.bulkWrite).not.toHaveBeenCalled();
		expect(mocks.info).not.toHaveBeenCalled();
	});
});
