import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { commentsService } from "./comments";
import type { Comment } from "@/domain/entities/Comment";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios, true);

function fakeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    _id: "c1",
    verseId: "v1",
    username: "alice",
    onTitle: false,
    bookReference: "Gn 1:1",
    text: "hello",
    tags: [],
    reports: [],
    likes: [],
    ...overrides,
  };
}

describe("commentsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createForVerse", () => {
    it("POSTs draft to /api/comments/verse/:verseId and returns the created comment", async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: fakeComment({ text: "new" }) });

      const result = await commentsService.createForVerse("v1", {
        text: "new",
        tags: ["devocional"],
        onTitle: true,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith("/api/comments/verse/v1", {
        text: "new",
        tags: ["devocional"],
        onTitle: true,
      });
      expect(result.text).toBe("new");
    });

    it("defaults tags to [] when omitted", async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: fakeComment() });
      await commentsService.createForVerse("v1", { text: "x" });
      expect(mockedAxios.post).toHaveBeenCalledWith("/api/comments/verse/v1", {
        text: "x",
        tags: [],
        onTitle: undefined,
      });
    });
  });

  describe("toggleLike", () => {
    it("PATCHes /api/comments/:id with action: like", async () => {
      mockedAxios.patch.mockResolvedValueOnce({ data: fakeComment({ likes: ["alice"] }) });
      const result = await commentsService.toggleLike("c1");
      expect(mockedAxios.patch).toHaveBeenCalledWith("/api/comments/c1", { action: "like" });
      expect(result.likes).toEqual(["alice"]);
    });
  });

  describe("report", () => {
    it("PATCHes /api/comments/:id with action: report", async () => {
      mockedAxios.patch.mockResolvedValueOnce({ data: fakeComment({ reports: ["bob"] }) });
      const result = await commentsService.report("c1");
      expect(mockedAxios.patch).toHaveBeenCalledWith("/api/comments/c1", { action: "report" });
      expect(result.reports).toEqual(["bob"]);
    });
  });

  describe("update", () => {
    it("PATCHes /api/comments/:id with text and tags", async () => {
      mockedAxios.patch.mockResolvedValueOnce({ data: fakeComment({ text: "edited" }) });
      const result = await commentsService.update("c1", { text: "edited", tags: ["pessoal"] });
      expect(mockedAxios.patch).toHaveBeenCalledWith("/api/comments/c1", {
        text: "edited",
        tags: ["pessoal"],
      });
      expect(result.text).toBe("edited");
    });
  });

  describe("delete", () => {
    it("DELETEs /api/comments/:id", async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: { success: true } });
      await commentsService.delete("c1");
      expect(mockedAxios.delete).toHaveBeenCalledWith("/api/comments/c1");
    });
  });

  describe("getForChapter", () => {
    it("GETs /api/comments/chapter/:abbrev/:chapter and returns title+verse comments", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { titleComments: [fakeComment({ onTitle: true })], verseComments: [fakeComment()] },
      });
      const result = await commentsService.getForChapter("gn", 1);
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/comments/chapter/gn/1");
      expect(result.titleComments).toHaveLength(1);
      expect(result.verseComments).toHaveLength(1);
    });
  });

  describe("getForVerse", () => {
    it("GETs /api/comments/chapter/:abbrev/:chapter/:verse", async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { titleComments: [], verseComments: [] },
      });
      await commentsService.getForVerse("gn", 1, 1);
      expect(mockedAxios.get).toHaveBeenCalledWith("/api/comments/chapter/gn/1/1");
    });
  });
});
