import { defineConfig } from "drizzle-kit";

import { loadRootEnv } from "../../scripts/load-env.mjs";

loadRootEnv();

export default defineConfig({
  dialect: "postgresql",
  out: "./migrations",
  schema: "./src/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ""
  },
  strict: true,
  verbose: true
});
