import { runCommand } from "./run-command.mjs";

const defaultDatabaseUrl = "postgres://schedule_share:schedule_share@localhost:5432/schedule_share";
const [rawCommand, ...args] = process.argv.slice(2);

if (rawCommand === undefined) {
  console.error("Usage: node scripts/run-with-local-db.mjs <command> [...args]");
  process.exit(1);
}

try {
  await runCommand(rawCommand, args, {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? defaultDatabaseUrl
    }
  });
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }

  process.exit(1);
}
