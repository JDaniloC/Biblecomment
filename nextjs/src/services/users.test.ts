import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { usersService } from "./users";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios, true);

describe("usersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("register POSTs to /api/users with email/username/password", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { email: "alice@example.com", username: "alice" },
    });
    const result = await usersService.register({
      email: "alice@example.com",
      username: "alice",
      password: "secret-123",
    });
    expect(mockedAxios.post).toHaveBeenCalledWith("/api/users", {
      email: "alice@example.com",
      username: "alice",
      password: "secret-123",
    });
    expect(result.username).toBe("alice");
  });

  it("list GETs /api/users?pages=:n", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    await usersService.list(2);
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/users?pages=2");
  });

  it("getMe GETs /api/users/me", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        email: "a@x",
        username: "alice",
        booksCount: 0,
        chaptersCount: 0,
        commentsCount: 0,
      },
    });
    const result = await usersService.getMe();
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/users/me");
    expect(result.username).toBe("alice");
  });

  it("updateProfile PATCHes /api/users with the partial update", async () => {
    mockedAxios.patch.mockResolvedValueOnce({ data: {} });
    await usersService.updateProfile({ belief: "catholic", state: "SP" });
    expect(mockedAxios.patch).toHaveBeenCalledWith("/api/users", {
      belief: "catholic",
      state: "SP",
    });
  });

  it("deleteSelf DELETEs /api/users with body { email }", async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
    await usersService.deleteSelf("alice@example.com");
    expect(mockedAxios.delete).toHaveBeenCalledWith("/api/users", {
      data: { email: "alice@example.com" },
    });
  });

  it("setModerator PATCHes /api/users/moderator with the email and flag", async () => {
    mockedAxios.patch.mockResolvedValueOnce({
      data: { email: "bob@example.com", username: "bob", moderator: true },
    });
    const result = await usersService.setModerator("bob@example.com", true);
    expect(mockedAxios.patch).toHaveBeenCalledWith("/api/users/moderator", {
      email: "bob@example.com",
      moderator: true,
    });
    expect(result.moderator).toBe(true);
  });
});
