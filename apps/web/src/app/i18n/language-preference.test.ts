import { describe, expect, it } from "vitest";

import {
  languagePreferenceStorageKey,
  readPreferredLocale,
  rememberPreferredLocale
} from "./language-preference";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("language preference", () => {
  it("reads and writes supported locales", () => {
    const storage = new MemoryStorage();

    rememberPreferredLocale(storage, "en");

    expect(storage.getItem(languagePreferenceStorageKey)).toBe("en");
    expect(readPreferredLocale(storage)).toBe("en");

    rememberPreferredLocale(storage, "zh-CN");

    expect(storage.getItem(languagePreferenceStorageKey)).toBe("zh-CN");
    expect(readPreferredLocale(storage)).toBe("zh-CN");
  });

  it("ignores invalid stored locale values", () => {
    const storage = new MemoryStorage();
    storage.setItem(languagePreferenceStorageKey, "fr");

    expect(readPreferredLocale(storage)).toBeUndefined();
  });

  it("ignores unavailable storage", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      }
    };

    expect(readPreferredLocale(storage)).toBeUndefined();
    expect(() => rememberPreferredLocale(storage, "en")).not.toThrow();
  });
});
