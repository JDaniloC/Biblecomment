import { describe, it, expect } from "vitest";
import { partitionByApproved } from "./community-prioritization";

const mk = (username: string, id: string) => ({ username, _id: id });

describe("partitionByApproved", () => {
	it("splits by approved usernames, preserving order in each bucket", () => {
		const comments = [
			mk("alice", "1"),
			mk("bob", "2"),
			mk("alice", "3"),
			mk("carol", "4"),
		];
		const { prioritized, others } = partitionByApproved(
			comments,
			new Set(["alice", "carol"]),
		);
		expect(prioritized.map((c) => c._id)).toEqual(["1", "3", "4"]);
		expect(others.map((c) => c._id)).toEqual(["2"]);
	});

	it("empty approved set → everything in others, prioritized empty", () => {
		const comments = [mk("a", "1"), mk("b", "2")];
		const r = partitionByApproved(comments, new Set());
		expect(r.prioritized).toHaveLength(0);
		expect(r.others.map((c) => c._id)).toEqual(["1", "2"]);
	});

	it("no comments → both buckets empty", () => {
		const r = partitionByApproved([], new Set(["alice"]));
		expect(r.prioritized).toEqual([]);
		expect(r.others).toEqual([]);
	});
});
