import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Guards the PWA manifest shape so the PWABuilder/TWA-relevant fields
// don't silently regress (valid JSON + id/shortcuts/share_target/
// launch_handler/screenshots present).
const manifest = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public", "manifest.webmanifest"),
    "utf8",
  ),
);

describe("manifest.webmanifest", () => {
  it("has a stable id and core identity", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
  });

  it("declares 4 shortcuts to real routes", () => {
    expect(manifest.shortcuts).toHaveLength(4);
    expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual([
      "/home",
      "/search",
      "/discussions",
      "/communities",
    ]);
  });

  it("declares share_target → /search?q=", () => {
    expect(manifest.share_target.action).toBe("/search");
    expect(manifest.share_target.method).toBe("GET");
    expect(manifest.share_target.params).toEqual({ text: "q" });
  });

  it("declares launch_handler navigate-existing", () => {
    expect(manifest.launch_handler.client_mode).toContain("navigate-existing");
  });

  it("keeps icons + screenshots", () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.screenshots.length).toBeGreaterThanOrEqual(1);
  });
});
