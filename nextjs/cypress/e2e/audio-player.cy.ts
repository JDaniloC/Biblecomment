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

// Single visit hook: seeds localStorage and stubs HTMLMediaElement before the
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
function stubAudioAndTours(win: Cypress.AUTWindow) {
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

  // Setting `src` still makes Electron fetch and decode the fake 1-byte mp3, and its
  // real `error` event would put the player in "Erro ao tocar" at a random moment.
  // Drop every browser-made (trusted) media event in the capture phase, before it
  // reaches the provider; the events this stub dispatches are untrusted and pass.
  for (const type of ["loadedmetadata", "timeupdate", "ended", "error"]) {
    win.addEventListener(
      type,
      (e) => {
        if (e.isTrusted && e.target instanceof win.HTMLMediaElement) e.stopImmediatePropagation();
      },
      true,
    );
  }
}

// The timings land a tick after cy.wait("@timings") (fetch → json → ref), and each
// currentTime write fires a single timeupdate: keep writing until the highlight lands.
function playAt(seconds: number, verse: number) {
  cy.get("audio").should(($a) => {
    const audio = $a[0] as HTMLAudioElement;
    audio.currentTime = seconds;
    const highlighted = audio.ownerDocument.querySelector('li[data-now-reading="true"]');
    expect(highlighted?.id).to.equal(String(verse));
  });
}

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
    // The header shows its page tools (ListenButton included) only from lg (1024px)
    // up; below that they move into the "⋮" menu. Cypress' default is 1000px wide.
    cy.viewport(1280, 800);
    cy.visit("/verses/gn/1", { onBeforeLoad: stubAudioAndTours });

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
    playAt(0.5, 1); // 500 ms

    // Advance to 1.3 s (verse 2 window: [1200, 1700)).
    // Confirms the highlight updates as playback progresses.
    playAt(1.3, 2); // 1300 ms

    // MiniPlayer controls are present and actionable.
    cy.get('[data-testid="mini-player-toggle"]').should("be.visible");
    cy.get('[data-testid="mini-player-rate"]').should("be.visible");
    cy.get('[data-testid="mini-player-close"]').should("be.visible");
  });

  it("shows a persistent listen bar on mobile that hands off to the mini player", () => {
    cy.viewport(390, 844); // iPhone-ish, matches mobile-tabbar.cy.ts convention
    cy.visit("/verses/gn/1", { onBeforeLoad: stubAudioAndTours });

    cy.wait("@manifest");

    // Idle: the persistent "listen" bar fills the gap before playback starts;
    // the mini player (which only mounts once engaged) is not there yet.
    cy.get('[data-testid="chapter-listen-bar"]').should("be.visible");
    cy.get('[data-testid="mini-player"]').should("not.exist");

    cy.get('[data-testid="chapter-listen-bar-button"]').click();

    // Engaged: the mini player takes over the same bottom slot, idle bar hides.
    cy.get('[data-testid="mini-player"]').should("be.visible");
    cy.get('[data-testid="chapter-listen-bar"]').should("not.exist");
  });

  it("hides the idle listen bar while the comments sidebar is open on mobile", () => {
    cy.viewport(390, 844);
    cy.visit("/verses/gn/1", { onBeforeLoad: stubAudioAndTours });

    cy.wait("@manifest");
    cy.get('[data-testid="chapter-listen-bar"]').should("be.visible");

    // Opening a verse's comments covers the same bottom slot on mobile —
    // the idle "Ouvir este capítulo" prompt would otherwise render on top
    // of the sidebar (both fixed to the bottom of the viewport).
    cy.get('[data-testid="verse-text"]').first().click();
    cy.get('[data-testid="comments-sidebar"]').should("be.visible");
    cy.get('[data-testid="chapter-listen-bar"]').should("not.exist");
    // This voice has chapter files only (no verseAudio): no single-verse play offered.
    cy.get('[data-testid="verse-listen-button"]').should("not.exist");

    // Closing the sidebar brings the idle bar back.
    cy.findByLabelText("Fechar comentários").click();
    cy.get('[data-testid="chapter-listen-bar"]').should("be.visible");
  });

  it("the header Ouvir button pauses and resumes instead of restarting the chapter", () => {
    cy.viewport(1280, 800); // header tools are visible from lg (1024px) up
    cy.visit("/verses/gn/1", { onBeforeLoad: stubAudioAndTours });
    cy.wait("@manifest");

    const paused = (expected: boolean) =>
      cy.get("audio").should(($a) => {
        expect(($a[0] as HTMLAudioElement).paused).to.equal(expected);
      });

    cy.get('[data-testid="listen-button"]').click();
    cy.get('[data-testid="mini-player"]').should("be.visible");
    paused(false);

    // Second tap while playing: pause (it used to reload the chapter and play on).
    cy.get('[data-testid="listen-button"]').click();
    paused(true);
    cy.get('[data-testid="mini-player-toggle"]').should("have.attr", "aria-label", "Tocar");

    // Third tap: resume.
    cy.get('[data-testid="listen-button"]').click();
    paused(false);
    cy.get('[data-testid="mini-player-toggle"]').should("have.attr", "aria-label", "Pausar");
  });

  it("while playing with the comments open, tapping a verse jumps to it and opens its comments", () => {
    // Slow timings: a tap right after playback starts must wait for them, not be dropped.
    cy.intercept("GET", `${BASE}/audio/${VOICE}/gn/1.json`, { body: timings, delay: 800 });
    cy.viewport(1280, 800); // desktop: the verses stay clickable next to the sidebar
    cy.visit("/verses/gn/1", { onBeforeLoad: stubAudioAndTours });
    cy.wait("@manifest");

    cy.get('[data-testid="verse-text"]').eq(0).click();
    cy.get('[data-testid="comments-sidebar"]').should("contain.text", "Gn 1:1");
    cy.get('[data-testid="listen-button"]').click();
    cy.get('[data-testid="mini-player"]').should("be.visible");

    cy.get('[data-testid="verse-text"]').eq(1).click(); // before the timings arrive
    // The audio jumps to verse 2 (timings: 1200 ms) and the sidebar follows it.
    cy.get("audio").should(($a) => {
      expect(($a[0] as HTMLAudioElement).currentTime).to.equal(1.2);
    });
    cy.get('[data-testid="comments-sidebar"]').should("contain.text", "Gn 1:2");

    // Tapping the verse whose comments are already open keeps them open.
    cy.get('[data-testid="verse-text"]').eq(1).click();
    cy.get('[data-testid="comments-sidebar"]').should("contain.text", "Gn 1:2");
  });

  it("plays one verse alone from the verse panel and keeps it highlighted", () => {
    // A voice that ships one MP3 per verse. Later intercepts win over beforeEach's.
    cy.intercept("GET", `${BASE}/audio/${VOICE}/manifest.json`, { ...manifest, verseAudio: true }).as(
      "manifestPerVerse",
    );
    cy.intercept("GET", `${BASE}/audio/${VOICE}/gn/1/*.mp3`, {
      statusCode: 200,
      headers: { "content-type": "audio/mpeg" },
      body: "x",
    }).as("verseMp3");
    // Slow timings: ⏭ pressed before they arrive must wait for them, not be dropped.
    cy.intercept("GET", `${BASE}/audio/${VOICE}/gn/1.json`, { body: timings, delay: 800 });

    cy.visit("/verses/gn/1", { onBeforeLoad: stubAudioAndTours });
    cy.wait("@manifestPerVerse");

    cy.get('[data-testid="verse-text"]').first().click();
    cy.get('[data-testid="verse-listen-button"]').should("be.visible").click();

    // The verse's own file plays, and the player says which verse.
    cy.get("audio").should("have.attr", "src", `${BASE}/audio/${VOICE}/gn/1/1.mp3`);
    cy.get('[data-testid="mini-player-title"]').should("contain.text", "GN 1:1");
    cy.get('li[data-now-reading="true"]').should("have.attr", "id", "1");

    // ⏭ (before the timings arrive) moves to the next verse, played alone as well.
    cy.get('[data-testid="mini-player-next"]').click();
    cy.get("audio").should("have.attr", "src", `${BASE}/audio/${VOICE}/gn/1/2.mp3`);
    cy.get('[data-testid="mini-player-title"]').should("contain.text", "GN 1:2");
    cy.get('li[data-now-reading="true"]').should("have.attr", "id", "2");

    // The timings are in now (⏭ needed them). 0.5 s falls in verse 1's window of the
    // chapter timings, but the file playing is verse 2 alone: the highlight stays on 2.
    cy.get("audio").then(($a) => {
      ($a[0] as HTMLAudioElement).currentTime = 0.5;
    });
    cy.get('li[data-now-reading="true"]').should("have.attr", "id", "2");
  });

  describe("experimental mode (cloned voices)", () => {
    const CLONE = "danilo-clone";

    beforeEach(() => {
      // danilo-clone narrates Genesis 1; jessica-clone has no Genesis.
      cy.intercept("GET", `${BASE}/audio/${CLONE}/manifest.json`, {
        ...manifest,
        voiceId: CLONE,
        label: "Danilo",
        verseAudio: true,
        chapters: { gn: { "1": manifest.chapters.gn["1"] } },
      }).as("cloneManifest");
      cy.intercept("GET", `${BASE}/audio/jessica-clone/manifest.json`, {
        ...manifest,
        voiceId: "jessica-clone",
        chapters: { ex: { "1": manifest.chapters.gn["1"] } },
      }).as("otherCloneManifest");
      cy.intercept("GET", `${BASE}/audio/${CLONE}/gn/1.json`, { ...timings, voiceId: CLONE });
      const mp3 = { statusCode: 200, headers: { "content-type": "audio/mpeg" }, body: "x" };
      cy.intercept("GET", `${BASE}/audio/${CLONE}/gn/1.mp3`, mp3); // the chapter
      cy.intercept("GET", `${BASE}/audio/${CLONE}/gn/1/*.mp3`, mp3); // one verse alone
    });

    it("plays the chapter in the cloned voice that has it, and says so", () => {
      cy.viewport(1280, 800); // header tools (ListenButton) only from lg up
      cy.visit("/verses/gn/1", {
        onBeforeLoad: (win) => {
          stubAudioAndTours(win);
          win.localStorage.setItem("bc:experimental", "1");
        },
      });
      cy.wait(["@manifest", "@cloneManifest", "@otherCloneManifest"]);

      cy.get('[data-testid="listen-button"]').should("be.visible").click();
      cy.get("audio").should("have.attr", "src", `${BASE}/audio/${CLONE}/gn/1.mp3`);
      cy.get('[data-testid="mini-player-subtitle"]').should("have.text", "Voz experimental: Danilo");
      playAt(1.3, 2); // the clone's own timings drive the highlight

      // Only the clone ships per-verse files; with it narrating, a verse plays alone too.
      cy.get('[data-testid="mini-player-close"]').click();
      cy.get('[data-testid="verse-text"]').first().click();
      cy.get('[data-testid="verse-listen-button"]').should("be.visible").click();
      cy.get("audio").should("have.attr", "src", `${BASE}/audio/${CLONE}/gn/1/1.mp3`);
    });

    it("keeps the default voice, and never asks for the clones, while it is off", () => {
      cy.viewport(1280, 800);
      cy.visit("/verses/gn/1", { onBeforeLoad: stubAudioAndTours });
      cy.wait("@manifest");

      cy.get('[data-testid="listen-button"]').should("be.visible").click();
      cy.get("audio").should("have.attr", "src", `${BASE}/audio/${VOICE}/gn/1.mp3`);
      cy.get('[data-testid="mini-player-subtitle"]').should("have.text", "Bíblia narrada");
      cy.get("@cloneManifest.all").should("have.length", 0);
      cy.get("@otherCloneManifest.all").should("have.length", 0);
    });
  });
});
