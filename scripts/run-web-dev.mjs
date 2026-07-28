import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRootEnv } from "./load-env.mjs";
import { runCommand } from "./run-command.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

loadRootEnv();

try {
  await runCommand("corepack", ["pnpm", "dev"], {
    cwd: resolve(repoRoot, "apps/web")
  });
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }

  process.exit(1);
}
