import { describe, it, expect, afterEach } from "vitest";
import {
  DEFAULT_VOICE_ID,
  experimentalVoiceName,
  getVoiceId,
  isExperimentalMode,
  setExperimentalMode,
  setVoiceId,
  subscribeExperimentalMode,
} from "./voice-pref";

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

describe("experimental mode", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it("is off without a window (SSR) and when nothing is stored", () => {
    expect(isExperimentalMode()).toBe(false);
    installWindow();
    expect(isExperimentalMode()).toBe(false);
  });

  it("round-trips on and off, and off leaves no key behind", () => {
    installWindow();
    setExperimentalMode(true);
    expect(isExperimentalMode()).toBe(true);
    expect((globalThis as any).window.localStorage.getItem("bc:experimental")).toBe("1");
    setExperimentalMode(false);
    expect(isExperimentalMode()).toBe(false);
    expect((globalThis as any).window.localStorage.getItem("bc:experimental")).toBe(null);
  });

  it("tells subscribers about a change until they unsubscribe", () => {
    installWindow();
    const target = new EventTarget();
    Object.assign((globalThis as any).window, {
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
    });
    let calls = 0;
    const unsubscribe = subscribeExperimentalMode(() => calls++);
    setExperimentalMode(true);
    expect(calls).toBe(1);
    unsubscribe();
    setExperimentalMode(false);
    expect(calls).toBe(1);
  });

  it("names the experimental voices and nothing else", () => {
    expect(experimentalVoiceName("jessica-clone")).toBe("Jéssica");
    expect(experimentalVoiceName("danilo-clone")).toBe(null); // retired on 2026-10-31
    expect(experimentalVoiceName(DEFAULT_VOICE_ID)).toBe(null);
  });
});
