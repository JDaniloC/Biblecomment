import { describe, it, expect } from "vitest";
import { escapeRegExp } from "./escape-regexp";

describe("escapeRegExp", () => {
	it("escapes RegExp metacharacters", () => {
		expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c");
	});

	it("escapes the full metachar set", () => {
		expect(escapeRegExp(".*+?^${}()|[]\\")).toBe(
			"\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\",
		);
	});

	it("leaves plain text untouched", () => {
		expect(escapeRegExp("graça jo")).toBe("graça jo");
	});

	it("produces a RegExp that matches the literal substring", () => {
		const rx = new RegExp(escapeRegExp("a.b*c"));
		expect(rx.test("x a.b*c y")).toBe(true);
		expect(rx.test("axbxc")).toBe(false);
	});
});
