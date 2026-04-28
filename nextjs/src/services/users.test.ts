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

vi.mock("@/app/actions/users", () => ({
  updateProfileAction: vi.fn(),
  deleteSelfAction: vi.fn(),
  changePasswordAction: vi.fn(),
  setModeratorAction: vi.fn(),
}));

const mockedAxios = vi.mocked(axios, true);
import {
  updateProfileAction,
  deleteSelfAction,
  changePasswordAction,
  setModeratorAction,
} from "@/app/actions/users";

const mockedUpdateProfile = vi.mocked(updateProfileAction);
const mockedDeleteSelf = vi.mocked(deleteSelfAction);
const mockedChangePassword = vi.mocked(changePasswordAction);
const mockedSetModerator = vi.mocked(setModeratorAction);

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

  it("updateProfile delegates to updateProfileAction", async () => {
    mockedUpdateProfile.mockResolvedValueOnce({ ok: true, data: { updated: true } });
    await usersService.updateProfile({ belief: "catholic", state: "SP" });
    expect(mockedUpdateProfile).toHaveBeenCalledWith({
      belief: "catholic",
      state: "SP",
    });
  });

  it("deleteSelf delegates to deleteSelfAction", async () => {
    mockedDeleteSelf.mockResolvedValueOnce({ ok: true, data: { deleted: true } });
    await usersService.deleteSelf("alice@example.com");
    expect(mockedDeleteSelf).toHaveBeenCalledWith("alice@example.com");
  });

  it("setModerator delegates to setModeratorAction", async () => {
    mockedSetModerator.mockResolvedValueOnce({
      ok: true,
      data: { email: "bob@example.com", username: "bob", moderator: true },
    });
    const result = await usersService.setModerator("bob@example.com", true);
    expect(mockedSetModerator).toHaveBeenCalledWith("bob@example.com", true);
    expect(result.moderator).toBe(true);
  });

  it("changePassword delegates to changePasswordAction", async () => {
    mockedChangePassword.mockResolvedValueOnce({ ok: true, data: { success: true } });
    await usersService.changePassword("old", "new");
    expect(mockedChangePassword).toHaveBeenCalledWith("old", "new");
  });
});
