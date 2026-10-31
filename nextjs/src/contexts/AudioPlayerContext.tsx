"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { VoiceManifest, VerseTimings } from "@/lib/audio/types";
import {
  mediaBaseUrl,
  manifestUrl,
  chapterAudioUrl,
  chapterTimingsUrl,
  verseAudioUrl,
  isVerseAudioAvailable,
  verseAtTime,
  nextChapterWithin,
  prevChapterWithin,
  adjacentVerse,
  firstVerse,
  voiceForChapter,
} from "@/lib/audio/player";
import {
  EXPERIMENTAL_VOICES,
  experimentalVoiceName,
  getVoiceId,
  isExperimentalMode,
  setExperimentalMode,
  subscribeExperimentalMode,
} from "@/lib/audio/voice-pref";
import {
  initialPlayerState,
  playerReducer,
  type AudioPlayerState,
} from "@/lib/audio/player-state";

interface AudioPlayerContextValue {
  state: AudioPlayerState;
  /** The default voice's manifest. */
  manifest: VoiceManifest | null;
  available: boolean;
  /** Cloned voices narrate the chapters they have (/profile → Configurações), on this device. */
  experimentalMode: boolean;
  setExperimentalMode: (on: boolean) => void;
  isChapterAvailable: (abbrev: string, chapter: number) => boolean;
  isVerseAudioAvailable: (abbrev: string, chapter: number) => boolean;
  playChapter: (abbrev: string, chapter: number, fromVerse?: number | null) => Promise<void>;
  /** Plays one verse alone (its own MP3) and stops at its end. */
  playVerse: (abbrev: string, chapter: number, verse: number) => void;
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
  const defaultVoiceId = useMemo(() => getVoiceId(), []);
  const base = useMemo(() => mediaBaseUrl(), []);
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState(defaultVoiceId));
  const [manifests, setManifests] = useState<Record<string, VoiceManifest | null>>({});
  // Off on the server and while hydrating (no localStorage there), then this device's choice.
  const experimental = useSyncExternalStore(subscribeExperimentalMode, isExperimentalMode, () => false);

  // Who narrates a chapter: with experimental mode on, the first cloned voice that has
  // it; otherwise (or when none has it) the default voice.
  const voiceOrder = useMemo(
    () => (experimental ? [...EXPERIMENTAL_VOICES.map((v) => v.id), defaultVoiceId] : [defaultVoiceId]),
    [experimental, defaultVoiceId],
  );
  const voiceFor = (abbrev: string, chapter: number) =>
    voiceForChapter(voiceOrder, manifests, abbrev, chapter);

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

  // Fetch each voice's manifest once, when it is first needed (only if configured).
  const requestedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!base) return;
    for (const id of voiceOrder) {
      if (requestedRef.current.has(id)) continue;
      requestedRef.current.add(id);
      fetch(manifestUrl(base, id))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((m: VoiceManifest | null) => setManifests((prev) => ({ ...prev, [id]: m })));
    }
  }, [base, voiceOrder]);

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
      if (st.mode === "verse") return; // one verse was asked for: stop there
      if (st.abbrev && st.chapter != null) {
        const nxt = nextChapterWithin(manifests[st.voiceId] ?? null, st.abbrev, st.chapter);
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
  }, [manifests]);

  // Verse-level commands (tap a verse, ⏮/⏭) need the chapter timings, which land a
  // moment after playback starts. Until then they wait for the load instead of being
  // dropped; a newer load (another chapter) or stop() cancels the ones still waiting.
  const timingsLoadRef = useRef<Promise<VerseTimings | null>>(Promise.resolve(null));
  const timingsKeyRef = useRef<string | null>(null);

  // Best-effort: sync degrades gracefully without timings.
  function loadTimings(voiceId: string, abbrev: string, chapter: number): Promise<VerseTimings | null> {
    timingsRef.current = null;
    timingsKeyRef.current = `${voiceId}/${abbrev}/${chapter}`;
    const load: Promise<VerseTimings | null> = base
      ? fetch(chapterTimingsUrl(base, voiceId, abbrev, chapter))
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((t: VerseTimings | null) => {
            if (timingsLoadRef.current === load) timingsRef.current = t; // still this chapter
            return t;
          })
      : Promise.resolve(null);
    timingsLoadRef.current = load;
    return load;
  }

  /** Runs `run` with the current chapter's timings, now or as soon as they load. */
  function withTimings(run: (t: VerseTimings) => void) {
    if (timingsRef.current) {
      run(timingsRef.current);
      return;
    }
    const load = timingsLoadRef.current;
    void load.then((t) => {
      if (t && timingsLoadRef.current === load) run(t);
    });
  }

  async function playChapter(abbrev: string, chapter: number, fromVerse: number | null = null) {
    const audio = audioRef.current;
    if (!audio || !base) return;
    const voiceId = voiceFor(abbrev, chapter) ?? defaultVoiceId;
    dispatch({ type: "LOAD", abbrev, chapter, fromVerse, voiceId });
    void loadTimings(voiceId, abbrev, chapter);
    if (fromVerse != null) {
      withTimings((t) => {
        const span = t.verses[String(fromVerse)];
        if (span) audio.currentTime = span.startMs / 1000;
      });
    }
    audio.src = chapterAudioUrl(base, voiceId, abbrev, chapter);
    audio.load(); // triggers loadedmetadata → onLoaded → play()
  }
  // Stable ref so onEnded can call the latest playChapter.
  const playChapterRef = useRef(playChapter);
  playChapterRef.current = playChapter;

  function playVerse(abbrev: string, chapter: number, verse: number) {
    const audio = audioRef.current;
    if (!audio || !base) return;
    const voiceId = voiceFor(abbrev, chapter) ?? defaultVoiceId;
    dispatch({ type: "LOAD", abbrev, chapter, fromVerse: verse, mode: "verse", voiceId });
    // The chapter timings are only needed for ⏮/⏭ (which verses exist); keep them
    // (or their load in flight) when stepping inside the same chapter.
    if (timingsKeyRef.current !== `${voiceId}/${abbrev}/${chapter}`) void loadTimings(voiceId, abbrev, chapter);
    audio.src = verseAudioUrl(base, voiceId, abbrev, chapter, verse);
    audio.load(); // triggers loadedmetadata → onLoaded → play()
  }

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
    const st = stateRef.current;
    if (st.mode === "verse" && st.abbrev && st.chapter != null) {
      playVerse(st.abbrev, st.chapter, verse); // verse mode: the other verse, alone too
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    withTimings((t) => {
      const span = t.verses[String(verse)];
      if (!span) return;
      audio.currentTime = span.startMs / 1000;
      if (audio.paused) {
        audio.play().then(() => dispatch({ type: "PLAY" })).catch(() => dispatch({ type: "ERROR" }));
      }
    });
  }

  // Skip to the next verse; at the last verse, roll into the next chapter.
  function nextVerse() {
    withTimings((t) => {
      const st = stateRef.current;
      const cur = st.currentVerse ?? firstVerse(t);
      if (cur == null) return;
      const nv = adjacentVerse(t, cur, 1);
      if (nv != null) seekToVerse(nv);
      else if (st.mode !== "verse") next(); // past the last verse → next chapter (autoplay from start)
    });
  }

  // Skip to the previous verse; at the first verse, roll into the previous chapter.
  function prevVerse() {
    withTimings((t) => {
      const st = stateRef.current;
      const cur = st.currentVerse ?? firstVerse(t);
      if (cur == null) return;
      const pv = adjacentVerse(t, cur, -1);
      if (pv != null) {
        seekToVerse(pv);
      } else if (st.mode !== "verse" && st.abbrev && st.chapter != null) {
        const pc = prevChapterWithin(manifests[st.voiceId] ?? null, st.abbrev, st.chapter);
        if (pc != null) void playChapter(st.abbrev, pc);
      }
    });
  }

  function setRate(rate: number) {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    dispatch({ type: "RATE", rate });
  }

  function next() {
    const st = stateRef.current;
    if (st.abbrev && st.chapter != null) {
      const nxt = nextChapterWithin(manifests[st.voiceId] ?? null, st.abbrev, st.chapter);
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
    // Forget the timings and cancel any verse command still waiting for them.
    timingsRef.current = null;
    timingsLoadRef.current = Promise.resolve(null);
    timingsKeyRef.current = null;
    dispatch({ type: "STOP" });
  }

  // Media Session (lockscreen / notification controls).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (state.abbrev && state.chapter != null) {
      const verse = state.mode === "verse" && state.currentVerse != null ? `:${state.currentVerse}` : "";
      const clone = experimentalVoiceName(state.voiceId);
      ms.metadata = new MediaMetadata({
        title: `${state.abbrev.toUpperCase()} ${state.chapter}${verse}`,
        artist: clone ? `Voz experimental: ${clone}` : "Bíblia narrada",
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
  }, [state.abbrev, state.chapter, state.isPlaying, state.mode, state.currentVerse, state.voiceId]);

  const value: AudioPlayerContextValue = {
    state,
    manifest: manifests[defaultVoiceId] ?? null,
    available: Boolean(base && manifests[defaultVoiceId]),
    experimentalMode: experimental,
    setExperimentalMode,
    isChapterAvailable: (abbrev, chapter) => voiceFor(abbrev, chapter) != null,
    isVerseAudioAvailable: (abbrev, chapter) => {
      const voiceId = voiceFor(abbrev, chapter);
      return voiceId != null && isVerseAudioAvailable(manifests[voiceId] ?? null, abbrev, chapter);
    },
    playChapter,
    playVerse,
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
