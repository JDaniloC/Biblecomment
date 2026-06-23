import { describe, it, expect, afterEach } from "vitest";
import { DEFAULT_VOICE_ID, getVoiceId, setVoiceId } from "./voice-pref";

// Minimal localStorage stub on globalThis.window for the browser branch.
function installWindow() {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
}

describe("voice-pref", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it("returns the default when there is no window (SSR) ", () => {
    expect(getVoiceId()).toBe(DEFAULT_VOICE_ID);
  });

  it("returns the default when nothing stored, and round-trips a non-default voice", () => {
    installWindow();
    expect(getVoiceId()).toBe(DEFAULT_VOICE_ID);
    setVoiceId("pt-BR-FranciscaNeural");
    expect(getVoiceId()).toBe("pt-BR-FranciscaNeural");
  });

  it("clears the key when setting back to the default", () => {
    installWindow();
    setVoiceId("pt-BR-FranciscaNeural");
    setVoiceId(DEFAULT_VOICE_ID);
    expect((globalThis as any).window.localStorage.getItem("bc:voice")).toBe(null);
    expect(getVoiceId()).toBe(DEFAULT_VOICE_ID);
  });
});
