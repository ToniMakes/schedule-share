import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { apiErrorCodes, apiErrorResponseSchema } from "../src";

describe("apiErrorCodes", () => {
  it("accepts every registered error code in API error responses", () => {
    for (const code of apiErrorCodes) {
      expect(
        apiErrorResponseSchema.parse({
          error: {
            code,
            message: "Test error."
          }
        })
      ).toEqual({
        error: {
          code,
          message: "Test error."
        }
      });
    }
  });

  it("matches the common error code list in docs/api.md", () => {
    expect(readApiDocErrorCodes()).toEqual([...apiErrorCodes].sort());
  });
});

function readApiDocErrorCodes() {
  const apiDoc = readFileSync(
    resolve(import.meta.dirname, "../../../docs/api.md"),
    "utf8"
  ).replaceAll("\r\n", "\n");
  const match = apiDoc.match(/常见错误码：\n\n(?<list>(?:- `[^`]+`\n?)+)/u);

  if (match?.groups?.list === undefined) {
    throw new Error("Could not find the common error code list in docs/api.md.");
  }

  return [...match.groups.list.matchAll(/- `(?<code>[^`]+)`/gu)]
    .map((item) => item.groups?.code)
    .filter((code): code is string => code !== undefined)
    .sort();
}
