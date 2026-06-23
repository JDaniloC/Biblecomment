// Pure state machine for the audio player. The React provider (Task 4) is a thin
// shell that dispatches these actions from <audio> events and Media Session.
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface AudioPlayerState {
  voiceId: string;
  abbrev: string | null;
  chapter: number | null;
  isPlaying: boolean; // intent (autoplay on load); status reflects realized state
  currentTimeMs: number;
  currentVerse: number | null;
  rate: number;
  status: PlayerStatus;
}

export type PlayerAction =
  | { type: "LOAD"; abbrev: string; chapter: number; fromVerse?: number | null }
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
  };
}

export function playerReducer(state: AudioPlayerState, action: PlayerAction): AudioPlayerState {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        abbrev: action.abbrev,
        chapter: action.chapter,
        status: "loading",
        isPlaying: true, // intent: autoplay once metadata is ready
        currentTimeMs: 0,
        currentVerse: action.fromVerse ?? null,
      };
    case "READY":
      return { ...state, status: state.isPlaying ? "playing" : "paused" };
    case "PLAY":
      return { ...state, isPlaying: true, status: "playing" };
    case "PAUSE":
      return { ...state, isPlaying: false, status: "paused" };
    case "TIME":
      return { ...state, currentTimeMs: action.ms, currentVerse: action.verse };
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
