import { describe, it, expect } from "vitest";
import { getTagMetas, getTagMetaOrNeutral, TAG_ORDER } from "./tag-meta";

describe("getTagMetas", () => {
  it("returns the neutral 'Comentário' meta for an empty tag list", () => {
    const metas = getTagMetas([]);
    expect(metas).toHaveLength(1);
    expect(metas[0].label).toBe("Comentário");
    expect(metas[0].icon).toBe("comment");
  });

  it("returns the neutral meta when no tag is a known category", () => {
    expect(getTagMetas(["nope", "unknown"]).map((m) => m.label)).toEqual([
      "Comentário",
    ]);
  });

  it("returns a single meta for a single known tag", () => {
    expect(getTagMetas(["pessoal"]).map((m) => m.label)).toEqual(["Pessoal"]);
  });

  it("orders multiple tags most-personal → most-studied regardless of input order", () => {
    // Input deliberately reversed; output must follow TAG_ORDER
    // (pessoal → devocional → inspirado → exegese).
    expect(
      getTagMetas(["exegese", "inspirado", "devocional", "pessoal"]).map(
        (m) => m.label,
      ),
    ).toEqual(["Pessoal", "Devocional", "Inspirado", "Exegese"]);
  });

  it("maps the legacy 'exegetico' alias to Exegese", () => {
    expect(getTagMetas(["exegetico"]).map((m) => m.label)).toEqual(["Exegese"]);
  });

  it("dedupes the exegese/exegetico alias pair into a single Exegese badge", () => {
    expect(getTagMetas(["exegese", "exegetico"]).map((m) => m.label)).toEqual([
      "Exegese",
    ]);
  });

  it("agrees with getTagMetaOrNeutral on the primary (first) meta", () => {
    expect(getTagMetas(["exegese", "pessoal"])[0]).toEqual(
      getTagMetaOrNeutral(["exegese", "pessoal"]),
    );
  });
});

describe("TAG_ORDER", () => {
  it("is ordered from most personal to most studied", () => {
    expect([...TAG_ORDER]).toEqual([
      "pessoal",
      "devocional",
      "inspirado",
      "exegese",
    ]);
  });
});
