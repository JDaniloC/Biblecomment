import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { discussionsService } from "./discussions";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/app/actions/discussions", () => ({
  createDiscussionAction: vi.fn(),
  addAnswerAction: vi.fn(),
  updateAnswerAction: vi.fn(),
  deleteDiscussionAction: vi.fn(),
}));

const mockedAxios = vi.mocked(axios, true);
import {
  createDiscussionAction,
  addAnswerAction,
  updateAnswerAction,
  deleteDiscussionAction,
} from "@/app/actions/discussions";

const mockedCreate = vi.mocked(createDiscussionAction);
const mockedAddAnswer = vi.mocked(addAnswerAction);
const mockedUpdateAnswer = vi.mocked(updateAnswerAction);
const mockedDelete = vi.mocked(deleteDiscussionAction);

const sampleDiscussion = {
  _id: "d1",
  bookAbbrev: "gn",
  username: "alice",
  verseReference: "Gn 1:1",
  verseText: "",
  commentText: "",
  title: "Why?",
  question: "Why?",
  answers: [] as Array<{
    _id?: string;
    name: string;
    text: string;
    authorEmailVerified?: boolean;
    likeCount: number;
    likedByMe: boolean;
  }>,
  answersCount: 0,
  likeCount: 0,
  likedByMe: false,
};

describe("discussionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createForBook delegates to createDiscussionAction", async () => {
    mockedCreate.mockResolvedValueOnce({ ok: true, data: sampleDiscussion });
    const result = await discussionsService.createForBook("gn", {
      commentId: "c1",
      title: "Why?",
      body: "Because.",
    });
    expect(mockedCreate).toHaveBeenCalledWith("gn", {
      commentId: "c1",
      title: "Why?",
      body: "Because.",
    });
    expect(result._id).toBe("d1");
  });

  it("getForBook GETs /api/discussion/:abbrev?pages=:n", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [sampleDiscussion] });
    await discussionsService.getForBook("gn", 2);
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/discussion/gn?pages=2");
  });

  it("getForBook defaults page to 1", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    await discussionsService.getForBook("gn");
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/discussion/gn?pages=1");
  });

  it("getById GETs /api/discussion/:abbrev/:id", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: sampleDiscussion });
    await discussionsService.getById("gn", "d1");
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/discussion/gn/d1");
  });

  it("addAnswer delegates to addAnswerAction", async () => {
    mockedAddAnswer.mockResolvedValueOnce({
      ok: true,
      data: { ...sampleDiscussion, answers: [{ name: "bob", text: "ok", likeCount: 0, likedByMe: false }], answersCount: 1 },
    });
    const result = await discussionsService.addAnswer("gn", "d1", "ok");
    expect(mockedAddAnswer).toHaveBeenCalledWith("gn", "d1", "ok");
    expect(result.answers).toHaveLength(1);
  });

  it("updateAnswer delegates to updateAnswerAction", async () => {
    mockedUpdateAnswer.mockResolvedValueOnce({
      ok: true,
      data: { ...sampleDiscussion, answers: [{ _id: "a1", name: "bob", text: "edited", likeCount: 0, likedByMe: false }], answersCount: 1 },
    });
    const result = await discussionsService.updateAnswer("gn", "d1", "a1", "edited");
    expect(mockedUpdateAnswer).toHaveBeenCalledWith("gn", "d1", "a1", "edited");
    expect(result.answers[0].text).toBe("edited");
  });

  it("delete delegates to deleteDiscussionAction", async () => {
    mockedDelete.mockResolvedValueOnce({ ok: true, data: { deleted: true } });
    await discussionsService.delete("gn", "d1");
    expect(mockedDelete).toHaveBeenCalledWith("gn", "d1");
  });

  it("listAll GETs /api/discussions?pages=:n", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    await discussionsService.listAll(3);
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/discussions?pages=3");
  });
});
