import { describe, it, expect } from "vitest";
import { initialPlayerState, playerReducer } from "./player-state";

describe("playerReducer", () => {
  const s0 = initialPlayerState("v");

  it("starts idle with the given voice", () => {
    expect(s0).toMatchObject({ voiceId: "v", status: "idle", isPlaying: false, rate: 1 });
    expect(s0.abbrev).toBe(null);
  });

  it("LOAD sets the target chapter, intends to play, and resets position", () => {
    const s = playerReducer({ ...s0, currentTimeMs: 999, currentVerse: 5 }, {
      type: "LOAD", abbrev: "gn", chapter: 1, fromVerse: 3,
    });
    expect(s).toMatchObject({ abbrev: "gn", chapter: 1, status: "loading", isPlaying: true });
    expect(s.currentTimeMs).toBe(0);
    expect(s.currentVerse).toBe(3); // fromVerse seeds the highlight before playback
  });

  it("READY starts playing when play was intended", () => {
    const loading = playerReducer(s0, { type: "LOAD", abbrev: "gn", chapter: 1 });
    expect(playerReducer(loading, { type: "READY" }).status).toBe("playing");
  });

  it("READY stays paused when play was not intended", () => {
    const paused = { ...initialPlayerState("v"), isPlaying: false };
    expect(playerReducer(paused, { type: "READY" }).status).toBe("paused");
  });

  it("PLAY/PAUSE toggle status and isPlaying", () => {
    const playing = { ...s0, status: "paused" as const, isPlaying: false };
    expect(playerReducer(playing, { type: "PLAY" })).toMatchObject({ status: "playing", isPlaying: true });
    expect(playerReducer({ ...playing, isPlaying: true, status: "playing" }, { type: "PAUSE" }))
      .toMatchObject({ status: "paused", isPlaying: false });
  });

  it("TIME records the position and current verse", () => {
    const s = playerReducer(s0, { type: "TIME", ms: 1234, verse: 2 });
    expect(s).toMatchObject({ currentTimeMs: 1234, currentVerse: 2 });
  });

  it("RATE updates the playback rate", () => {
    expect(playerReducer(s0, { type: "RATE", rate: 1.5 }).rate).toBe(1.5);
  });

  it("ERROR moves to error and stops", () => {
    expect(playerReducer(s0, { type: "ERROR" })).toMatchObject({ status: "error", isPlaying: false });
  });

  it("ENDED pauses (autoplay-next is the provider's job)", () => {
    const playing = { ...s0, status: "playing" as const, isPlaying: true };
    expect(playerReducer(playing, { type: "ENDED" })).toMatchObject({ status: "paused", isPlaying: false });
  });

  it("STOP clears the chapter but keeps voice and rate", () => {
    const playing = { ...s0, rate: 1.25, abbrev: "gn", chapter: 1, status: "playing" as const, isPlaying: true, currentVerse: 4 };
    const s = playerReducer(playing, { type: "STOP" });
    expect(s).toMatchObject({ status: "idle", isPlaying: false, abbrev: null, chapter: null, currentVerse: null, rate: 1.25, voiceId: "v" });
  });
});
