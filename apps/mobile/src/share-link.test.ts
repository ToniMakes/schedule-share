import { describe, expect, it } from "vitest";
import { parseShareLink } from "./share-link";

describe("parseShareLink", () => {
  it("accepts a bare schedule code", () => {
    expect(parseShareLink("  abc123 ")).toEqual({ publicId: "abc123" });
  });

  it("reads web share links including locale prefixes", () => {
    expect(parseShareLink("https://example.com/s/abc123")).toEqual({ publicId: "abc123" });
    expect(parseShareLink("https://example.com/zh/s/abc123?x=1")).toEqual({ publicId: "abc123" });
  });

  it("reads app deep links", () => {
    expect(parseShareLink("scheduleshare://s/abc123")).toEqual({ publicId: "abc123" });
  });

  it("reads the organizer key only from manage links", () => {
    expect(parseShareLink("https://example.com/s/abc123/manage?key=k%2B1-_")).toEqual({
      publicId: "abc123",
      ownerKey: "k+1-_"
    });
    expect(parseShareLink("https://example.com/s/abc123/edit/p1?key=editsecret")).toEqual({
      publicId: "abc123"
    });
  });

  it("rejects empty or malformed input", () => {
    expect(parseShareLink("")).toBeNull();
    expect(parseShareLink("not a code!")).toBeNull();
    expect(parseShareLink("ab")).toBeNull();
  });
});
