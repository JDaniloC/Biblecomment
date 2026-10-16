import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { communityService } from "./communities";

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("communityService.approve / reject error status", () => {
	it("reject exposes response.status 404 for a request that is no longer pending", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: "Not found" }));
		const err = await communityService.reject("grace", "u1").catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toBe("Not found");
		expect(err.response).toEqual({ status: 404 });
		expect(fetchMock).toHaveBeenCalledWith("/api/communities/grace/requests/u1", {
			method: "DELETE",
		});
	});

	it("approve exposes response.status 404 when the requester's account is gone", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: "Not found" }));
		const err = await communityService.approve("grace", "u1").catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect(err.response).toEqual({ status: 404 });
	});

	it("keeps the non-404 status (and HTTP fallback message) for other failures", async () => {
		fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
		const err = await communityService.reject("grace", "u1").catch((e) => e);
		expect(err.message).toBe("HTTP 500");
		expect(err.response).toEqual({ status: 500 });
	});

	it("approve still resolves with `changed` on success", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true, changed: false }));
		await expect(communityService.approve("grace", "u1")).resolves.toEqual({
			changed: false,
		});
	});
});
