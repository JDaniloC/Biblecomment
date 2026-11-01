// Voice preference, following the localStorage convention of src/lib/haptic.ts.
// 1 voice in v1 (no UI selector), but everything is keyed by voiceId so a second
// voice only needs the selector wired in.
const VOICE_KEY = "bc:voice";
const EXPERIMENTAL_KEY = "bc:experimental";

/**
 * Cloned voices, heard only with "Modo experimental" on (/profile → Configurações).
 * Each narrates a book or two; a chapter plays in the first of these that has it,
 * and every other chapter keeps the default voice.
 */
export const EXPERIMENTAL_VOICES: readonly { id: string; name: string }[] = [
  { id: "jessica-clone", name: "Jéssica" },
];

/** The speaker's name for an experimental voice, null for any other voice. */
export function experimentalVoiceName(voiceId: string): string | null {
  return EXPERIMENTAL_VOICES.find((v) => v.id === voiceId)?.name ?? null;
}

export const DEFAULT_VOICE_ID =
  process.env.NEXT_PUBLIC_AUDIO_VOICE_ID || "pt-BR-AntonioNeural";

export function getVoiceId(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE_ID;
  try {
    return window.localStorage?.getItem(VOICE_KEY) || DEFAULT_VOICE_ID;
  } catch {
    return DEFAULT_VOICE_ID;
  }
}

export function setVoiceId(voiceId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (voiceId && voiceId !== DEFAULT_VOICE_ID) {
      window.localStorage?.setItem(VOICE_KEY, voiceId);
    } else {
      window.localStorage?.removeItem(VOICE_KEY);
    }
  } catch {
    /* ignore quota/availability errors, same as haptic.ts */
  }
}

/** Off unless this device turned it on. */
export function isExperimentalMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage?.getItem(EXPERIMENTAL_KEY) === "1";
  } catch {
    return false;
  }
}

const EXPERIMENTAL_EVENT = "bc:experimental-change";

export function setExperimentalMode(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) {
      window.localStorage?.setItem(EXPERIMENTAL_KEY, "1");
    } else {
      window.localStorage?.removeItem(EXPERIMENTAL_KEY);
    }
  } catch {
    /* ignore quota/availability errors, same as haptic.ts */
  }
  window.dispatchEvent?.(new Event(EXPERIMENTAL_EVENT));
}

/** For useSyncExternalStore: fires on a change in this tab (setExperimentalMode) or another one. */
export function subscribeExperimentalMode(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EXPERIMENTAL_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EXPERIMENTAL_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
