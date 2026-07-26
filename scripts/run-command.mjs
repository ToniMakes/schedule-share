import { spawn } from "node:child_process";

export function runCommand(rawCommand, rawArgs, options = {}) {
  const { args, command } = normalizeCommand(rawCommand, rawArgs);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      shell: false,
      stdio: options.stdio ?? "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${rawCommand} ${rawArgs.join(" ")} exited with signal ${signal}.`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${rawCommand} ${rawArgs.join(" ")} exited with code ${code}.`));
        return;
      }

      resolve();
    });
  });
}

function normalizeCommand(rawCommand, rawArgs) {
  if (process.platform !== "win32") {
    return {
      args: rawArgs,
      command: rawCommand
    };
  }

  if (!["corepack", "corepack.cmd", "pnpm", "pnpm.cmd"].includes(rawCommand)) {
    return {
      args: rawArgs,
      command: rawCommand
    };
  }

  return {
    args: ["/d", "/s", "/c", [rawCommand, ...rawArgs].map(quoteCmdArg).join(" ")],
    command: "cmd.exe"
  };
}

function quoteCmdArg(value) {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}
