// Verse synthesis via the free Edge TTS neural voices. One synth per verse,
// returning the MP3 bytes + an estimated duration.
//
// We shell out to the maintained Python `edge-tts` package instead of a Node
// library: Microsoft's free endpoint now requires a rotating `Sec-MS-GEC`
// security handshake that the stale Node `msedge-tts` no longer satisfies
// (it 403s), while `edge-tts` tracks those endpoint changes. This is the
// fallback the design doc anticipated ("é script de build, a linguagem é
// indiferente"). This wrapper is the single isolation point for the TTS API —
// it keeps the `{ buffer, durationMs }` contract so the orchestrator is unaware.
//
// Prerequisite: Python 3 + `pip install edge-tts`. Override the interpreter
// with PYTHON_BIN (default "python").
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { durationFromMp3Bytes } = require("../src/lib/audio/contract.js");

const BITRATE_KBPS = 48; // edge-tts default = audio-24khz-48kbitrate-mono-mp3
const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const MAX_BUFFER = 64 * 1024 * 1024; // a verse MP3 is ~20KB; 64MB is ample headroom

function runEdgeTts(args) {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON_BIN,
      ["-m", "edge_tts", ...args],
      { encoding: "buffer", maxBuffer: MAX_BUFFER },
      (err, stdout, stderr) => {
        if (err) {
          const detail = stderr && stderr.length ? `: ${stderr.toString().trim()}` : "";
          reject(new Error(`edge-tts failed (${err.message})${detail}`));
          return;
        }
        resolve(stdout); // Buffer (MP3 bytes on stdout when --write-media is omitted)
      },
    );
  });
}

async function synthesizeVerse(text, voiceId) {
  // Pass the verse via a temp file (--file) to avoid shell-escaping issues with
  // quotes/accents/newlines in the text.
  const tmp = path.join(os.tmpdir(), `bc-tts-${crypto.randomUUID()}.txt`);
  await fs.promises.writeFile(tmp, text, "utf8");
  try {
    const buffer = await runEdgeTts(["--voice", voiceId, "--file", tmp]);
    if (!buffer || buffer.length === 0) {
      throw new Error(`edge-tts produced empty audio for: "${text.slice(0, 40)}…"`);
    }
    return { buffer, durationMs: durationFromMp3Bytes(buffer.length, BITRATE_KBPS) };
  } finally {
    fs.promises.unlink(tmp).catch(() => {});
  }
}

module.exports = { synthesizeVerse, BITRATE_KBPS };
