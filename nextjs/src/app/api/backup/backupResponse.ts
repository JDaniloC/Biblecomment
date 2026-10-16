import { NextResponse } from "next/server";

/**
 * A backup export as a JSON download: never cached (it carries personal
 * data, beliefs included) and saved as a dated file. The body stays the
 * bare array the matching POST accepts, so a file can be posted back as is.
 */
export function backupDownload(kind: string, data: unknown, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="biblecomment-backup-${kind}-${date}.json"`,
    },
  });
}
