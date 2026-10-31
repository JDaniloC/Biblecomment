// Pure state machine for the audio player. The React provider (Task 4) is a thin
// shell that dispatches these actions from <audio> events and Media Session.
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
/** "verse": the file playing is one verse alone, which stays highlighted throughout. */
export type PlayerMode = "chapter" | "verse";

export interface AudioPlayerState {
  voiceId: string;
  abbrev: string | null;
  chapter: number | null;
  isPlaying: boolean; // intent (autoplay on load); status reflects realized state
  currentTimeMs: number;
  currentVerse: number | null;
  rate: number;
  status: PlayerStatus;
  mode: PlayerMode;
}

export type PlayerAction =
  | {
      type: "LOAD";
      abbrev: string;
      chapter: number;
      fromVerse?: number | null;
      mode?: PlayerMode;
      /** The voice that narrates this chapter (an experimental one may differ from the default). */
      voiceId?: string;
    }
  | { type: "READY" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TIME"; ms: number; verse: number | null }
  | { type: "RATE"; rate: number }
  | { type: "ERROR" }
  | { type: "ENDED" }
  | { type: "STOP" };

export function initialPlayerState(voiceId: string): AudioPlayerState {
  return {
    voiceId,
    abbrev: null,
    chapter: null,
    isPlaying: false,
    currentTimeMs: 0,
    currentVerse: null,
    rate: 1,
    status: "idle",
    mode: "chapter",
  };
}

/**
 * What a chapter's "Ouvir" button does. While this chapter (or one of its verses)
 * plays it pauses, and a paused chapter resumes where it stopped; anything else
 * (idle, another chapter, an error, a paused single verse) starts the chapter.
 */
export function listenAction(
  state: AudioPlayerState,
  abbrev: string,
  chapter: number,
): "toggle" | "start" {
  const engagedHere =
    state.abbrev === abbrev && state.chapter === chapter && state.status !== "idle" && state.status !== "error";
  if (!engagedHere) return "start";
  if (state.isPlaying) return "toggle";
  return state.mode === "chapter" ? "toggle" : "start";
}

export function playerReducer(state: AudioPlayerState, action: PlayerAction): AudioPlayerState {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        voiceId: action.voiceId ?? state.voiceId,
        abbrev: action.abbrev,
        chapter: action.chapter,
        status: "loading",
        isPlaying: true, // intent: autoplay once metadata is ready
        currentTimeMs: 0,
        currentVerse: action.fromVerse ?? null,
        mode: action.mode ?? "chapter",
      };
    case "READY":
      return { ...state, status: state.isPlaying ? "playing" : "paused" };
    case "PLAY":
      return { ...state, isPlaying: true, status: "playing" };
    case "PAUSE":
      return { ...state, isPlaying: false, status: "paused" };
    case "TIME":
      return {
        ...state,
        currentTimeMs: action.ms,
        currentVerse: state.mode === "verse" ? state.currentVerse : action.verse,
      };
    case "RATE":
      return { ...state, rate: action.rate };
    case "ERROR":
      return { ...state, status: "error", isPlaying: false };
    case "ENDED":
      return { ...state, isPlaying: false, status: "paused" };
    case "STOP":
      return { ...initialPlayerState(state.voiceId), rate: state.rate };
    default:
      return state;
  }
}
