"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { VoiceManifest, VerseTimings } from "@/lib/audio/types";
import {
  mediaBaseUrl,
  manifestUrl,
  chapterAudioUrl,
  chapterTimingsUrl,
  isChapterAvailable,
  verseAtTime,
  nextChapterWithin,
  prevChapterWithin,
  adjacentVerse,
  firstVerse,
} from "@/lib/audio/player";
import { getVoiceId } from "@/lib/audio/voice-pref";
import {
  initialPlayerState,
  playerReducer,
  type AudioPlayerState,
} from "@/lib/audio/player-state";

interface AudioPlayerContextValue {
  state: AudioPlayerState;
  manifest: VoiceManifest | null;
  available: boolean;
  isChapterAvailable: (abbrev: string, chapter: number) => boolean;
  playChapter: (abbrev: string, chapter: number, fromVerse?: number | null) => Promise<void>;
  toggle: () => void;
  seekToVerse: (verse: number) => void;
  seekBy: (deltaMs: number) => void;
  prevVerse: () => void;
  nextVerse: () => void;
  setRate: (rate: number) => void;
  next: () => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const voiceId = useMemo(() => getVoiceId(), []);
  const base = useMemo(() => mediaBaseUrl(), []);
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState(voiceId));
  const [manifest, setManifest] = useState<VoiceManifest | null>(null);

  // One <audio> element for the whole app — created once via useMemo so the
  // side effect does not run in the render body. Returns null on SSR.
  const audio = useMemo<HTMLAudioElement | null>(() => {
    if (typeof window === "undefined") return null;
    const el = new Audio();
    el.preload = "metadata";
    return el;
  }, []);
  const audioRef = useRef<HTMLAudioElement | null>(audio);
  audioRef.current = audio;
  const timingsRef = useRef<VerseTimings | null>(null);
  // Keep the latest state available to event handlers without re-binding them.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Attach the (otherwise off-DOM) audio element to the document, hidden. The
  // MiniPlayer is the only UI; the element itself stays invisible. Being in the
  // DOM keeps it inspectable (e2e selects it via `audio`) and consistent with
  // how browsers associate Media Session with a live media element.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || typeof document === "undefined") return;
    a.setAttribute("aria-hidden", "true");
    a.style.display = "none";
    document.body.appendChild(a);
    return () => {
      a.remove();
    };
  }, []);

  // Fetch the manifest once (only if configured).
  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    fetch(manifestUrl(base, voiceId))
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!cancelled) setManifest(m);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [base, voiceId]);

  // Wire <audio> events to the reducer.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      audio.playbackRate = stateRef.current.rate;
      dispatch({ type: "READY" });
      audio.play().catch(() => dispatch({ type: "ERROR" }));
    };
    const onTime = () => {
      const ms = audio.currentTime * 1000;
      const t = timingsRef.current;
      const verse = t ? verseAtTime(t, ms) : null;
      dispatch({ type: "TIME", ms, verse });
    };
    const onEnded = () => {
      dispatch({ type: "ENDED" });
      const st = stateRef.current;
      if (st.abbrev && st.chapter != null) {
        const nxt = nextChapterWithin(manifest, st.abbrev, st.chapter);
        if (nxt != null) void playChapterRef.current(st.abbrev, nxt);
      }
    };
    const onError = () => dispatch({ type: "ERROR" });
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [manifest]);

  async function playChapter(abbrev: string, chapter: number, fromVerse: number | null = null) {
    const audio = audioRef.current;
    if (!audio || !base) return;
    dispatch({ type: "LOAD", abbrev, chapter, fromVerse });
    // Load this chapter's timings (best-effort; sync degrades gracefully without them).
    timingsRef.current = null;
    fetch(chapterTimingsUrl(base, voiceId, abbrev, chapter))
      .then((r) => (r.ok ? r.json() : null))
      .then((t: VerseTimings | null) => {
        timingsRef.current = t;
        if (t && fromVerse != null && t.verses[String(fromVerse)]) {
          audio.currentTime = t.verses[String(fromVerse)].startMs / 1000;
        }
      })
      .catch(() => {
        timingsRef.current = null;
      });
    audio.src = chapterAudioUrl(base, voiceId, abbrev, chapter);
    audio.load(); // triggers loadedmetadata → onLoaded → play()
  }
  // Stable ref so onEnded can call the latest playChapter.
  const playChapterRef = useRef(playChapter);
  playChapterRef.current = playChapter;

  function toggle() {
    const audio = audioRef.current;
    if (!audio || stateRef.current.abbrev == null) return;
    if (audio.paused) {
      audio.play().then(() => dispatch({ type: "PLAY" })).catch(() => dispatch({ type: "ERROR" }));
    } else {
      audio.pause();
      dispatch({ type: "PAUSE" });
    }
  }

  function seekBy(deltaMs: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime + deltaMs / 1000);
  }

  function seekToVerse(verse: number) {
    const audio = audioRef.current;
    const t = timingsRef.current;
    if (!audio || !t || !t.verses[String(verse)]) return;
    audio.currentTime = t.verses[String(verse)].startMs / 1000;
    if (audio.paused) {
      audio.play().then(() => dispatch({ type: "PLAY" })).catch(() => dispatch({ type: "ERROR" }));
    }
  }

  // Skip to the next verse; at the last verse, roll into the next chapter.
  function nextVerse() {
    const t = timingsRef.current;
    const st = stateRef.current;
    if (!t) return;
    const cur = st.currentVerse ?? firstVerse(t);
    if (cur == null) return;
    const nv = adjacentVerse(t, cur, 1);
    if (nv != null) seekToVerse(nv);
    else next(); // past the last verse → next chapter (autoplay from start)
  }

  // Skip to the previous verse; at the first verse, roll into the previous chapter.
  function prevVerse() {
    const t = timingsRef.current;
    const st = stateRef.current;
    if (!t) return;
    const cur = st.currentVerse ?? firstVerse(t);
    if (cur == null) return;
    const pv = adjacentVerse(t, cur, -1);
    if (pv != null) {
      seekToVerse(pv);
    } else if (st.abbrev && st.chapter != null) {
      const pc = prevChapterWithin(manifest, st.abbrev, st.chapter);
      if (pc != null) void playChapter(st.abbrev, pc);
    }
  }

  function setRate(rate: number) {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    dispatch({ type: "RATE", rate });
  }

  function next() {
    const st = stateRef.current;
    if (st.abbrev && st.chapter != null) {
      const nxt = nextChapterWithin(manifest, st.abbrev, st.chapter);
      if (nxt != null) void playChapter(st.abbrev, nxt);
    }
  }

  function stop() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    timingsRef.current = null;
    dispatch({ type: "STOP" });
  }

  // Media Session (lockscreen / notification controls).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (state.abbrev && state.chapter != null) {
      ms.metadata = new MediaMetadata({
        title: `${state.abbrev.toUpperCase()} ${state.chapter}`,
        artist: "Bíblia narrada",
        album: "Bible Comment",
      });
      ms.playbackState = state.isPlaying ? "playing" : "paused";
    }
    ms.setActionHandler("play", () => toggle());
    ms.setActionHandler("pause", () => toggle());
    // Lockscreen scrubbing stays time-based; track buttons step by verse.
    ms.setActionHandler("seekbackward", () => seekBy(-15000));
    ms.setActionHandler("seekforward", () => seekBy(15000));
    ms.setActionHandler("previoustrack", () => prevVerse());
    ms.setActionHandler("nexttrack", () => nextVerse());
    return () => {
      for (const a of [
        "play",
        "pause",
        "seekbackward",
        "seekforward",
        "previoustrack",
        "nexttrack",
      ] as const) {
        try {
          ms.setActionHandler(a, null);
        } catch {
          /* some browsers throw on unsupported actions */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.abbrev, state.chapter, state.isPlaying]);

  const value: AudioPlayerContextValue = {
    state,
    manifest,
    available: Boolean(base && manifest),
    isChapterAvailable: (abbrev, chapter) => isChapterAvailable(manifest, abbrev, chapter),
    playChapter,
    toggle,
    seekToVerse,
    seekBy,
    prevVerse,
    nextVerse,
    setRate,
    next,
    stop,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}
