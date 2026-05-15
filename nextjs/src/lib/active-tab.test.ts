import { describe, it, expect } from "vitest";
import { activeTab } from "./active-tab";

describe("activeTab", () => {
  it("maps home/books routes to 'livros'", () => {
    expect(activeTab("/home")).toBe("livros");
    expect(activeTab("/verses/gn/1")).toBe("livros");
    expect(activeTab("/chapter/gn/1")).toBe("livros");
  });
  it("maps discussion routes to 'discussoes'", () => {
    expect(activeTab("/discussions")).toBe("discussoes");
    expect(activeTab("/discussion/gn/123")).toBe("discussoes");
  });
  it("maps community routes to 'comunidades'", () => {
    expect(activeTab("/communities")).toBe("comunidades");
    expect(activeTab("/communities/reformados")).toBe("comunidades");
  });
  it("returns null when no tab matches", () => {
    expect(activeTab("/profile")).toBeNull();
    expect(activeTab("/login")).toBeNull();
  });
});
