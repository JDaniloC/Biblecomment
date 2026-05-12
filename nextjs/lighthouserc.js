// Lighthouse CI configuration. URLs are templated against A11Y_PORT so
// the same config works regardless of the orchestrator port pick (the
// server side picks the port too — the two stay in sync via env).
const PORT = parseInt(process.env.A11Y_PORT || "3001", 10);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const ROUTES = ["/", "/login", "/register", "/privacy", "/terms"];

module.exports = {
  ci: {
    collect: {
      url: ROUTES.map((r) => `${ORIGIN}${r}`),
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        onlyCategories: ["accessibility"],
        chromeFlags: "--no-sandbox --disable-dev-shm-usage --headless=new",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
