import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { haptic, isHapticEnabled, setHapticEnabled } from "./haptic";

type NavStub = { vibrate?: ReturnType<typeof vi.fn> };

function installNav(stub: NavStub): NavStub {
	vi.stubGlobal("navigator", stub);
	return stub;
}

function installStorage(): Storage {
	const store = new Map<string, string>();
	const storage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
		key: (i: number) => Array.from(store.keys())[i] ?? null,
		get length() {
			return store.size;
		},
	} as unknown as Storage;
	vi.stubGlobal("window", { localStorage: storage });
	return storage;
}

describe("haptic", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("calls navigator.vibrate with the 'tap' duration by default", () => {
		const nav = installNav({ vibrate: vi.fn() });
		installStorage();
		haptic();
		expect(nav.vibrate).toHaveBeenCalledWith(10);
	});

	it("dispatches the 'confirm' preset when requested", () => {
		const nav = installNav({ vibrate: vi.fn() });
		installStorage();
		haptic("confirm");
		expect(nav.vibrate).toHaveBeenCalledWith(15);
	});

	it("uses an error pattern (array) for the 'error' preset", () => {
		const nav = installNav({ vibrate: vi.fn() });
		installStorage();
		haptic("error");
		expect(nav.vibrate).toHaveBeenCalledWith([30, 60, 30]);
	});

	it("no-ops on platforms without the Vibration API (iOS Safari)", () => {
		installNav({}); // no vibrate
		installStorage();
		expect(() => haptic()).not.toThrow();
	});

	it("respects the user opt-out flag in localStorage", () => {
		const nav = installNav({ vibrate: vi.fn() });
		installStorage();
		setHapticEnabled(false);
		haptic();
		expect(nav.vibrate).not.toHaveBeenCalled();
		expect(isHapticEnabled()).toBe(false);
	});

	it("re-enables after setHapticEnabled(true)", () => {
		const nav = installNav({ vibrate: vi.fn() });
		installStorage();
		setHapticEnabled(false);
		setHapticEnabled(true);
		haptic();
		expect(nav.vibrate).toHaveBeenCalled();
		expect(isHapticEnabled()).toBe(true);
	});

	it("swallows vibrate() exceptions so the surrounding action keeps working", () => {
		const nav = installNav({
			vibrate: vi.fn().mockImplementation(() => {
				throw new Error("user-gesture required");
			}),
		});
		installStorage();
		expect(() => haptic()).not.toThrow();
		expect(nav.vibrate).toHaveBeenCalled();
	});
});
