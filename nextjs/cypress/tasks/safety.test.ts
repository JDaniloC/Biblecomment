import { describe, it, expect } from "vitest";
import { assertLocalMongoUri } from "./safety";

describe("assertLocalMongoUri", () => {
  it("accepts mongodb-memory-server URI (random port on 127.0.0.1)", () => {
    expect(() =>
      assertLocalMongoUri("mongodb://127.0.0.1:54321/biblecomment-cypress"),
    ).not.toThrow();
  });

  it("accepts plain localhost", () => {
    expect(() =>
      assertLocalMongoUri("mongodb://localhost:27017/test"),
    ).not.toThrow();
  });

  it("accepts ::1 (IPv6 loopback) in bracketed form", () => {
    expect(() => assertLocalMongoUri("mongodb://[::1]:27017/test")).not.toThrow();
  });

  it("rejects mongodb+srv:// (Atlas/cloud) regardless of host", () => {
    expect(() =>
      assertLocalMongoUri(
        "mongodb+srv://user:pass@cluster0.mongodb.net/biblecomment",
      ),
    ).toThrow(/mongodb\+srv/);
  });

  it("rejects a plain remote IP", () => {
    expect(() =>
      assertLocalMongoUri("mongodb://10.0.0.5:27017/biblecomment"),
    ).toThrow(/not local/);
  });

  it("rejects a remote hostname even with credentials", () => {
    expect(() =>
      assertLocalMongoUri("mongodb://admin:secret@db.example.com:27017/prod"),
    ).toThrow(/not local/);
  });

  it("rejects replica-set URIs where any host is non-local", () => {
    expect(() =>
      assertLocalMongoUri(
        "mongodb://localhost:27017,db.example.com:27017/test?replicaSet=rs0",
      ),
    ).toThrow(/not local/);
  });

  it("accepts replica-set URIs where every host is local", () => {
    expect(() =>
      assertLocalMongoUri(
        "mongodb://127.0.0.1:27017,localhost:27018,127.0.0.1:27019/test?replicaSet=rs0",
      ),
    ).not.toThrow();
  });

  it("throws when MONGODB_URI is undefined", () => {
    expect(() => assertLocalMongoUri(undefined)).toThrow(/not set/);
  });

  it("throws when MONGODB_URI is empty string", () => {
    expect(() => assertLocalMongoUri("")).toThrow(/not set/);
  });

  it("includes the context in the thrown error", () => {
    expect(() =>
      assertLocalMongoUri(
        "mongodb://prod.example.com:27017/biblecomment",
        "test-context",
      ),
    ).toThrow(/\[test-context\]/);
  });
});
