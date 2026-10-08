import { describe, expect, it } from "vitest";
import { redirectSystemPath } from "./app/+native-intent";

describe("redirectSystemPath", () => {
  it("sends share and organizer links to the home screen", () => {
    const link = "scheduleshare://s/abc123/manage?key=k1";
    expect(redirectSystemPath({ path: link, initial: true })).toBe(
      `/?link=${encodeURIComponent(link)}`
    );
    expect(redirectSystemPath({ path: "/s/abc123", initial: false })).toBe(
      `/?link=${encodeURIComponent("/s/abc123")}`
    );
  });

  it("leaves other paths alone", () => {
    expect(redirectSystemPath({ path: "/", initial: true })).toBe("/");
  });
});
