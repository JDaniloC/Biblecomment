// Voice preference, following the localStorage convention of src/lib/haptic.ts.
// 1 voice in v1 (no UI selector), but everything is keyed by voiceId so a second
// voice only needs the selector wired in.
const VOICE_KEY = "bc:voice";

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
