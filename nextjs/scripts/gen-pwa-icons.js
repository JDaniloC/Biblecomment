/* One-off PWA icon generator. Run with: node scripts/gen-pwa-icons.js
 * Reads public/assets/logo.png and writes icons under public/icons/ + apple-touch-icon.png. */
const sharp = require("sharp");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public/assets/logo.png");
const SRC_DARK = path.join(ROOT, "public/assets/logo-dark.png");
const ICONS_DIR = path.join(ROOT, "public/icons");
const APPLE_OUT = path.join(ROOT, "public/apple-touch-icon.png");

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const targets = [
	{ file: "icon-192.png", size: 192, padding: 0.12, bg: "#ffffff" },
	{ file: "icon-512.png", size: 512, padding: 0.12, bg: "#ffffff" },
	// Maskable: Android crops up to ~20% on each edge, so keep logo within
	// the inner 60% safe zone. Brand color background reads as intentional.
	{ file: "icon-512-maskable.png", size: 512, padding: 0.25, bg: "#1075d3" },
];

// Dark-mode favicons: the #D5EEF7 mark on a transparent ground so it
// reads on a dark browser tab strip. Referenced from app/layout.tsx via
// `media: (prefers-color-scheme: dark)`. No maskable (PWA manifest has
// no theme switch) and no dark apple-touch (iOS uses a single icon).
const darkTargets = [
	{ file: "icon-192-dark.png", size: 192, padding: 0.12, bg: TRANSPARENT },
	{ file: "icon-512-dark.png", size: 512, padding: 0.12, bg: TRANSPARENT },
];

async function compose({ src, outFile, size, padding, bg }) {
	const inner = Math.round(size * (1 - padding * 2));
	const logoBuf = await sharp(src)
		.resize(inner, inner, { fit: "contain", background: TRANSPARENT })
		.toBuffer();
	await sharp({
		create: { width: size, height: size, channels: 4, background: bg },
	})
		.composite([{ input: logoBuf, gravity: "center" }])
		.png()
		.toFile(outFile);
	console.log("wrote", path.relative(ROOT, outFile));
}

(async () => {
	for (const t of targets) {
		await compose({ src: SRC, outFile: path.join(ICONS_DIR, t.file), ...t });
	}
	await compose({
		src: SRC,
		outFile: APPLE_OUT,
		size: 180,
		padding: 0.12,
		bg: "#ffffff",
	});
	for (const t of darkTargets) {
		await compose({
			src: SRC_DARK,
			outFile: path.join(ICONS_DIR, t.file),
			...t,
		});
	}
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
