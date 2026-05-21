import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { syncAppBadge } from "./app-badge";

type NavMock = {
	setAppBadge?: ReturnType<typeof vi.fn>;
	clearAppBadge?: ReturnType<typeof vi.fn>;
};

function installNav(impl: NavMock): NavMock {
	// Node 22 makes globalThis.navigator a getter-only property, so plain
	// assignment throws. vi.stubGlobal handles the redefinition for us.
	vi.stubGlobal("navigator", impl);
	return impl;
}

describe("syncAppBadge", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("no-ops when Badging API is absent (Safari/Firefox)", () => {
		installNav({}); // no setAppBadge
		expect(() => syncAppBadge(5)).not.toThrow();
	});

	it("sets the badge to a positive integer count", () => {
		const nav = installNav({
			setAppBadge: vi.fn().mockResolvedValue(undefined),
			clearAppBadge: vi.fn().mockResolvedValue(undefined),
		});
		syncAppBadge(7);
		expect(nav.setAppBadge).toHaveBeenCalledWith(7);
		expect(nav.clearAppBadge).not.toHaveBeenCalled();
	});

	it("clears the badge when count is 0", () => {
		const nav = installNav({
			setAppBadge: vi.fn().mockResolvedValue(undefined),
			clearAppBadge: vi.fn().mockResolvedValue(undefined),
		});
		syncAppBadge(0);
		expect(nav.clearAppBadge).toHaveBeenCalled();
		expect(nav.setAppBadge).not.toHaveBeenCalled();
	});

	it("clears (not sets) when count is negative or NaN", () => {
		const nav = installNav({
			setAppBadge: vi.fn().mockResolvedValue(undefined),
			clearAppBadge: vi.fn().mockResolvedValue(undefined),
		});
		syncAppBadge(-3);
		syncAppBadge(NaN);
		expect(nav.setAppBadge).not.toHaveBeenCalled();
		expect(nav.clearAppBadge).toHaveBeenCalledTimes(2);
	});

	it("floors fractional counts (defensive)", () => {
		const nav = installNav({
			setAppBadge: vi.fn().mockResolvedValue(undefined),
			clearAppBadge: vi.fn().mockResolvedValue(undefined),
		});
		syncAppBadge(3.9);
		expect(nav.setAppBadge).toHaveBeenCalledWith(3);
	});

	it("swallows rejections so a Badging API failure can't crash callers", async () => {
		const nav = installNav({
			setAppBadge: vi.fn().mockRejectedValue(new Error("permission denied")),
			clearAppBadge: vi.fn().mockResolvedValue(undefined),
		});
		expect(() => syncAppBadge(2)).not.toThrow();
		await new Promise((r) => setTimeout(r, 0));
		expect(nav.setAppBadge).toHaveBeenCalled();
	});
});
