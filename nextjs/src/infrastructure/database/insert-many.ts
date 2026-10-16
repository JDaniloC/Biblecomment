import mongoose from "mongoose";

/** Strict 24-hex check; `ObjectId.isValid` also accepts any 12-char string. */
export function isObjectIdHex(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{24}$/i.test(id);
}

/** Duplicate-key code of a single write error, whichever shape it has. */
function writeErrorCode(e: unknown): number | undefined {
  const w = e as { code?: number; err?: { code?: number } };
  // Mongoose spreads the driver's WriteError into a plain object, which
  // drops its `code` getter but keeps the raw error under `err`.
  return w.code ?? w.err?.code;
}

/**
 * Unordered `insertMany` that treats rows rejected by a unique index as
 * already there instead of failing the whole call: returns how many
 * documents were inserted. Any other write error is rethrown. Lets a bulk
 * restore whose rows carry their original `_id` be re-run safely.
 */
export async function insertManyIgnoringDuplicates<T>(
  model: mongoose.Model<T>,
  docs: object[],
): Promise<number> {
  if (docs.length === 0) return 0;
  try {
    const inserted = await model.insertMany(docs as never, { ordered: false });
    return inserted.length;
  } catch (err) {
    const e = err as { writeErrors?: unknown[]; insertedDocs?: unknown[] };
    const writeErrors = Array.isArray(e.writeErrors) ? e.writeErrors : [];
    const onlyDuplicates =
      writeErrors.length > 0 && writeErrors.every((w) => writeErrorCode(w) === 11000);
    if (!onlyDuplicates || !Array.isArray(e.insertedDocs)) throw err;
    return e.insertedDocs.length;
  }
}
