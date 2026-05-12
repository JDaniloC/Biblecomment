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

vi.mock("@/app/actions/comments", () => ({
  toggleLikeAction: vi.fn(),
  reportCommentAction: vi.fn(),
  deleteCommentAction: vi.fn(),
  createCommentAction: vi.fn(),
  updateCommentAction: vi.fn(),
}));

const mockedAxios = vi.mocked(axios, true);
import {
  toggleLikeAction,
  reportCommentAction,
  deleteCommentAction,
  createCommentAction,
  updateCommentAction,
} from "@/app/actions/comments";

const mockedToggleLike = vi.mocked(toggleLikeAction);
const mockedReport = vi.mocked(reportCommentAction);
const mockedDelete = vi.mocked(deleteCommentAction);
const mockedCreate = vi.mocked(createCommentAction);
const mockedUpdate = vi.mocked(updateCommentAction);

function fakeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    _id: "c1",
    verseId: "v1",
    username: "alice",
    onTitle: false,
    bookReference: "Gn 1:1",
    text: "hello",
    tags: [],
    ...overrides,
  };
}

describe("commentsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createForVerse", () => {
    it("delegates to createCommentAction with the slug + draft and returns the created comment", async () => {
      mockedCreate.mockResolvedValueOnce({ ok: true, data: fakeComment({ text: "new" }) });

      const result = await commentsService.createForVerse("v1", {
        text: "new",
        tags: ["devocional"],
        onTitle: true,
      });

      expect(mockedCreate).toHaveBeenCalledWith("v1", {
        text: "new",
        tags: ["devocional"],
        onTitle: true,
      });
      expect(result.text).toBe("new");
    });

    it("defaults tags to [] when omitted", async () => {
      mockedCreate.mockResolvedValueOnce({ ok: true, data: fakeComment() });
      await commentsService.createForVerse("v1", { text: "x" });
      expect(mockedCreate).toHaveBeenCalledWith("v1", {
        text: "x",
        tags: [],
        onTitle: undefined,
      });
    });

  });

  describe("toggleLike", () => {
    it("delegates to toggleLikeAction and returns ToggleLikeResult", async () => {
      mockedToggleLike.mockResolvedValueOnce({
        ok: true,
        data: { commentId: "c1", likeCount: 1, likedByMe: true },
      });
      const result = await commentsService.toggleLike("c1");
      expect(mockedToggleLike).toHaveBeenCalledWith("c1");
      expect(result).toEqual({ commentId: "c1", likeCount: 1, likedByMe: true });
    });
  });

  describe("report", () => {
    it("delegates to reportCommentAction and returns ReportCommentResult", async () => {
      mockedReport.mockResolvedValueOnce({
        ok: true,
        data: { commentId: "c1", reportCount: 1, reportedByMe: true },
      });
      const result = await commentsService.report("c1");
      expect(mockedReport).toHaveBeenCalledWith("c1");
      expect(result).toEqual({ commentId: "c1", reportCount: 1, reportedByMe: true });
    });
  });

  describe("update", () => {
    it("delegates to updateCommentAction with text and tags", async () => {
      mockedUpdate.mockResolvedValueOnce({ ok: true, data: fakeComment({ text: "edited" }) });
      const result = await commentsService.update("c1", { text: "edited", tags: ["pessoal"] });
      expect(mockedUpdate).toHaveBeenCalledWith("c1", {
        text: "edited",
        tags: ["pessoal"],
      });
      expect(result.text).toBe("edited");
    });
  });

  describe("delete", () => {
    it("delegates to deleteCommentAction", async () => {
      mockedDelete.mockResolvedValueOnce({ ok: true, data: { deleted: true } });
      await commentsService.delete("c1");
      expect(mockedDelete).toHaveBeenCalledWith("c1");
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
