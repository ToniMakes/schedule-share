import { spawn } from "node:child_process";

const defaultDatabaseUrl = "postgres://schedule_share:schedule_share@localhost:5432/schedule_share";
const [rawCommand, ...args] = process.argv.slice(2);

if (rawCommand === undefined) {
  console.error("Usage: node scripts/run-with-local-db.mjs <command> [...args]");
  process.exit(1);
}

const command =
  process.platform === "win32" && rawCommand === "corepack" ? "corepack.cmd" : rawCommand;
const child = spawn(command, args, {
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? defaultDatabaseUrl
  },
  shell: false,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
