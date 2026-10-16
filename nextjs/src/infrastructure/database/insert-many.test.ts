import { describe, it, expect, vi } from "vitest";
import type mongoose from "mongoose";
import { insertManyIgnoringDuplicates, isObjectIdHex } from "./insert-many";

/** A model whose insertMany resolves or rejects as given. */
function fakeModel(insertMany: (docs: object[], opts: object) => Promise<unknown[]>) {
  const spy = vi.fn(insertMany);
  return { model: { insertMany: spy } as unknown as mongoose.Model<object>, insertMany: spy };
}

/**
 * The bulk error Mongoose throws for an unordered insertMany. It spreads
 * each driver WriteError into a plain object, which drops the `code`
 * getter but keeps the raw server error under `err`.
 */
function bulkError(codes: number[], insertedDocs: object[] | undefined) {
  return Object.assign(new Error("E11000 duplicate key error collection: comments"), {
    code: codes[0],
    writeErrors: codes.map((code, index) => ({ err: { index, code, errmsg: `code ${code}` }, index })),
    insertedDocs,
  });
}

const docs = [{ text: "a" }, { text: "b" }, { text: "c" }];

describe("insertManyIgnoringDuplicates", () => {
  it("inserts unordered and returns how many documents went in", async () => {
    const { model, insertMany } = fakeModel(async (d) => d);

    await expect(insertManyIgnoringDuplicates(model, docs)).resolves.toBe(3);
    expect(insertMany).toHaveBeenCalledWith(docs, { ordered: false });
  });

  it("does not call the database for an empty batch", async () => {
    const { model, insertMany } = fakeModel(async (d) => d);

    await expect(insertManyIgnoringDuplicates(model, [])).resolves.toBe(0);
    expect(insertMany).not.toHaveBeenCalled();
  });

  it("counts rows rejected as duplicate keys (11000) as not inserted", async () => {
    const { model } = fakeModel(async () => {
      throw bulkError([11000, 11000], [docs[1]]);
    });

    await expect(insertManyIgnoringDuplicates(model, docs)).resolves.toBe(1);
  });

  it("also reads the code from a write error that still has it", async () => {
    const { model } = fakeModel(async () => {
      throw Object.assign(new Error("dup"), {
        writeErrors: [{ code: 11000, index: 0 }],
        insertedDocs: [docs[1], docs[2]],
      });
    });

    await expect(insertManyIgnoringDuplicates(model, docs)).resolves.toBe(2);
  });

  it("returns 0 when every row already existed (a re-run)", async () => {
    const { model } = fakeModel(async () => {
      throw bulkError([11000, 11000, 11000], []);
    });

    await expect(insertManyIgnoringDuplicates(model, docs)).resolves.toBe(0);
  });

  it("rethrows when any write error is not a duplicate key", async () => {
    const failure = bulkError([11000, 121], [docs[2]]);
    const { model } = fakeModel(async () => {
      throw failure;
    });

    await expect(insertManyIgnoringDuplicates(model, docs)).rejects.toBe(failure);
  });

  it("rethrows an error that isn't a bulk write error", async () => {
    const failure = new Error("connection reset");
    const { model } = fakeModel(async () => {
      throw failure;
    });

    await expect(insertManyIgnoringDuplicates(model, docs)).rejects.toBe(failure);
  });

  it("rethrows a duplicate-key error that doesn't say what was inserted", async () => {
    const failure = bulkError([11000], undefined);
    const { model } = fakeModel(async () => {
      throw failure;
    });

    await expect(insertManyIgnoringDuplicates(model, docs)).rejects.toBe(failure);
  });
});

describe("isObjectIdHex", () => {
  it("accepts 24 hex characters in either case", () => {
    expect(isObjectIdHex("64b0000000000000000000aa")).toBe(true);
    expect(isObjectIdHex("64B0000000000000000000AA")).toBe(true);
  });

  it("rejects anything else, including the 12-character strings ObjectId.isValid takes", () => {
    for (const id of ["", "legacy-1", "aaaaaaaaaaaa", "64b0000000000000000000a", "64b0000000000000000000zz", undefined, 42]) {
      expect(isObjectIdHex(id)).toBe(false);
    }
  });
});
