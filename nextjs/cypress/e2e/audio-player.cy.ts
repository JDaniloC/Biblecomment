/// <reference types="cypress" />
/**
 * Audio player — happy-path e2e (manifest + timings mocked).
 *
 * BUILD REQUIREMENT
 * -----------------
 * The ListenButton is only rendered when NEXT_PUBLIC_AUDIO_BASE_URL is set
 * at Next.js build time (mediaBaseUrl() returns null otherwise, and the
 * provider never fetches the manifest or shows the button). The cy:test
 * script builds with `next build`, so the env must be present for that build,
 * and CYPRESS_SPEC selects this spec (cy-test.js reads it; there is no --spec):
 *
 *     NEXT_PUBLIC_AUDIO_BASE_URL=https://audio.test \
 *       CYPRESS_SPEC=cypress/e2e/audio-player.cy.ts npm run cy:test
 *
 * The dummy origin https://audio.test never needs to resolve; all requests
 * to it are captured by cy.intercept before they hit the network.
 *
 * Anti-flake
 * ----------
 * - tutorialsCompleted is seeded in localStorage before visiting so the
 *   chapter tour never opens and never steals pointer-events.
 * - HTMLMediaElement (play/pause/load/currentTime) is fully stubbed so
 *   headless Electron never tries to decode audio.
 * - The provider appends its single <audio> element to the document (hidden),
 *   so the test selects it with `cy.get("audio")` and drives `currentTime`
 *   on it (the stubbed setter fires timeupdate) — no app-side test hook.
 * - cy.intercept captures manifest, timings, and mp3 before the network.
 */

import bookFixture from "../fixtures/book-gn.json";

const VOICE = "pt-BR-AntonioNeural";
const BASE = "https://audio.test";

const manifest = {
  voiceId: VOICE,
  label: "Antonio",
  lang: "pt-BR",
  version: "v1.test",
  chapters: {
    gn: {
      "1": { durationMs: 1700, sizeBytes: 10 },
      "2": { durationMs: 10, sizeBytes: 10 },
    },
  },
};

const timings = {
  voiceId: VOICE,
  abbrev: "gn",
  chapter: 1,
  version: "v1.test",
  durationMs: 1700,
  verses: {
    "1": { startMs: 0, endMs: 1000 },
    "2": { startMs: 1200, endMs: 1700 },
  },
};

describe("audio player", () => {
  beforeEach(() => {
    // Reset and seed the DB with Genesis 1 so the chapter page renders.
    cy.resetDb();
    cy.seedDb({
      books: [bookFixture.book],
      verses: bookFixture.verses,
    });

    // Capture all audio assets before they hit https://audio.test.
    cy.intercept("GET", `${BASE}/audio/${VOICE}/manifest.json`, manifest).as(
      "manifest",
    );
    cy.intercept("GET", `${BASE}/audio/${VOICE}/gn/1.json`, timings).as(
      "timings",
    );
    cy.intercept("GET", `${BASE}/audio/${VOICE}/gn/1.mp3`, {
      statusCode: 200,
      headers: { "content-type": "audio/mpeg" },
      body: "x",
    }).as("mp3");
  });

  it("shows the listen button, plays, and highlights the now-reading verse", () => {
    // Single visit: seed localStorage and stub HTMLMediaElement before the
    // page loads so no home/chapter tour can auto-open and steal pointer-events.
    //
    // All five tour ids are seeded so every page tour is suppressed:
    //   chapter-v1, home-v1, communities-v1, discussions-v1, profile-v1
    //
    // HTMLMediaElement stub:
    //   load()       — fires loadedmetadata synchronously (triggers onLoaded).
    //   play()       — sets paused=false, returns Promise.resolve().
    //   pause()      — sets paused=true.
    //   currentTime  — getter/setter backed by closure; setter fires timeupdate
    //                  so the provider's onTime handler updates currentVerse.
    cy.visit("/verses/gn/1", {
      onBeforeLoad(win) {
        // Suppress all onboarding tours.
        win.localStorage.setItem(
          "tutorialsCompleted",
          JSON.stringify([
            "chapter-v1",
            "home-v1",
            "communities-v1",
            "discussions-v1",
            "profile-v1",
          ]),
        );

        // Stub HTMLMediaElement so headless Electron never decodes real audio.
        const proto = win.HTMLMediaElement.prototype as HTMLMediaElement;
        let t = 0;

        Object.defineProperty(proto, "paused", {
          writable: true,
          value: true,
          configurable: true,
        });

        Object.defineProperty(proto, "currentTime", {
          get() {
            return t;
          },
          set(v: number) {
            t = v;
            this.dispatchEvent(new win.Event("timeupdate"));
          },
          configurable: true,
        });

        proto.play = function () {
          (this as unknown as { paused: boolean }).paused = false;
          return Promise.resolve();
        };

        proto.pause = function () {
          (this as unknown as { paused: boolean }).paused = true;
        };

        // load() fires loadedmetadata so the provider's onLoaded callback runs.
        proto.load = function () {
          this.dispatchEvent(new win.Event("loadedmetadata"));
        };
      },
    });

    // Manifest is fetched once on mount by AudioPlayerProvider.
    cy.wait("@manifest");

    // ListenButton renders only when isChapterAvailable(gn, 1) is true,
    // i.e. the manifest was fetched and contains gn/1.
    cy.get('[data-testid="listen-button"]').should("be.visible").click();

    // playChapter() → audio.src set → audio.load() (stub fires loadedmetadata)
    // → onLoaded → dispatch READY → status="playing" → MiniPlayer renders.
    cy.get('[data-testid="mini-player"]').should("be.visible");

    // Timings are fetched concurrently with audio load.
    cy.wait("@timings");

    // The provider appends its single <audio> element to the document (hidden),
    // so we can reach it directly. Drive playback to 500 ms (verse 1 window:
    // [0, 1000)). The stubbed currentTime setter fires timeupdate on it →
    // provider's onTime → verseAtTime(timings, 500) === 1 → dispatch TIME{verse:1}
    // → audioState.currentVerse = 1 → nowReadingVerse prop = 1 →
    // ChapterReader sets data-now-reading="true" on verse 1's <li>.
    cy.get("audio").then(($a) => {
      ($a[0] as HTMLAudioElement).currentTime = 0.5; // 500 ms
    });

    cy.get('[data-now-reading="true"]').should("exist");

    // Advance to 1.3 s (verse 2 window: [1200, 1700)).
    // Confirms the highlight updates as playback progresses.
    cy.get("audio").then(($a) => {
      ($a[0] as HTMLAudioElement).currentTime = 1.3; // 1300 ms
    });

    cy.get('[data-now-reading="true"]').should("exist");

    // MiniPlayer controls are present and actionable.
    cy.get('[data-testid="mini-player-toggle"]').should("be.visible");
    cy.get('[data-testid="mini-player-rate"]').should("be.visible");
    cy.get('[data-testid="mini-player-close"]').should("be.visible");
  });
});
