import { describe, it, expect } from "vitest";
import {
	parseActive,
	activeQueryString,
	activeStorageKey,
} from "./useCommunityFilter";

// No @testing-library/react / jsdom in this repo, so the hook's pure
// logic is extracted and tested directly (same deviation pattern used
// for the other client hooks).

describe("useActiveCommunity pure helpers", () => {
	it("parseActive returns a single slug, null by default", () => {
		expect(parseActive(null)).toBeNull();
		expect(parseActive("")).toBeNull();
		expect(parseActive("  ")).toBeNull();
		expect(parseActive("alpha")).toBe("alpha");
	});

	it("parseActive ignores the legacy multi-select array shape", () => {
		expect(parseActive('["alpha","beta"]')).toBeNull();
		expect(parseActive("{}")).toBeNull();
	});

	it("activeQueryString builds ?community= or empty", () => {
		expect(activeQueryString(null)).toBe("");
		expect(activeQueryString("alpha")).toBe("?community=alpha");
		expect(activeQueryString("a b")).toBe("?community=a%20b");
	});

	it("activeStorageKey is per-username", () => {
		expect(activeStorageKey("alice")).toBe("bc:community-filter:alice");
		expect(activeStorageKey(null)).toBe("bc:community-filter:anon");
		expect(activeStorageKey()).toBe("bc:community-filter:anon");
	});
});
