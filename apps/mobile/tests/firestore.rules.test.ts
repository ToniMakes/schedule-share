import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-schedule-share",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(resolve(process.cwd(), "../../firestore.rules"), "utf8")
    }
  });
});

beforeEach(async () => environment.clearFirestore());
afterAll(async () => environment.cleanup());

describe("Firestore user data rules", () => {
  it("allows a user to read and write only their own profile and room list", async () => {
    const alice = environment.authenticatedContext("alice").firestore();
    const bob = environment.authenticatedContext("bob").firestore();
    const aliceProfile = doc(alice, "users/alice");
    const bobProfile = doc(bob, "users/alice");
    const aliceRoom = doc(alice, "users/alice/rooms/room-1");
    const bobRoom = doc(bob, "users/alice/rooms/room-1");

    await assertSucceeds(
      setDoc(aliceProfile, { displayName: "Alice", timezone: "Australia/Sydney" })
    );
    await assertSucceeds(getDoc(aliceProfile));
    await assertFails(getDoc(bobProfile));
    await assertSucceeds(setDoc(aliceRoom, { publicId: "room-1", title: "Planning" }));
    await assertSucceeds(getDoc(aliceRoom));
    await assertFails(getDoc(bobRoom));
  });

  it("denies unauthenticated writes", async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anonymous, "users/guest"), { displayName: "Guest" }));
  });
});
