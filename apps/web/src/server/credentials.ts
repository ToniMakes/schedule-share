import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(byteLength: number): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("base64url");
}

export function verifyKey(key: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashKey(key), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
