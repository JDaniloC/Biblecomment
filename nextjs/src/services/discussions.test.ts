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

const mockedAxios = vi.mocked(axios, true);

const sampleDiscussion = {
  _id: "d1",
  bookAbbrev: "gn",
  username: "alice",
  verseReference: "Gn 1:1",
  verseText: "",
  commentText: "",
  question: "Why?",
  answers: [],
};

describe("discussionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createForBook POSTs to /api/discussion/:abbrev", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: sampleDiscussion });
    const result = await discussionsService.createForBook("gn", {
      verseReference: "Gn 1:1",
      question: "Why?",
    });
    expect(mockedAxios.post).toHaveBeenCalledWith("/api/discussion/gn", {
      verseReference: "Gn 1:1",
      question: "Why?",
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

  it("addAnswer PATCHes /api/discussion/:abbrev/:id with the answer text", async () => {
    mockedAxios.patch.mockResolvedValueOnce({
      data: { ...sampleDiscussion, answers: [{ name: "bob", text: "ok" }] },
    });
    const result = await discussionsService.addAnswer("gn", "d1", "ok");
    expect(mockedAxios.patch).toHaveBeenCalledWith("/api/discussion/gn/d1", { text: "ok" });
    expect(result.answers).toHaveLength(1);
  });

  it("updateAnswer PATCHes /api/discussion/:abbrev/:id/answers/:answerId", async () => {
    mockedAxios.patch.mockResolvedValueOnce({
      data: { ...sampleDiscussion, answers: [{ _id: "a1", name: "bob", text: "edited" }] },
    });
    const result = await discussionsService.updateAnswer("gn", "d1", "a1", "edited");
    expect(mockedAxios.patch).toHaveBeenCalledWith(
      "/api/discussion/gn/d1/answers/a1",
      { text: "edited" },
    );
    expect(result.answers[0].text).toBe("edited");
  });

  it("delete DELETEs /api/discussion/:abbrev/:id", async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
    await discussionsService.delete("gn", "d1");
    expect(mockedAxios.delete).toHaveBeenCalledWith("/api/discussion/gn/d1");
  });

  it("listAll GETs /api/discussions?pages=:n", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    await discussionsService.listAll(3);
    expect(mockedAxios.get).toHaveBeenCalledWith("/api/discussions?pages=3");
  });
});
