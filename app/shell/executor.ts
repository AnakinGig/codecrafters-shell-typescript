import { execFileSync, spawn } from "child_process";
import fs from "fs";

import { type ParsedCommand } from "./types";
import { buildStdio } from "./redirects";
import { builtins } from "../builtins";
import { addJob } from "./jobs";

export function executeCommand(parsed: ParsedCommand): void {
  const builtin = builtins[parsed.command];

  if (builtin) {
    // Background builtins aren't meaningful for this stage; run normally
    builtin.execute(parsed.args, parsed.redirects);
    return;
  }

  if (parsed.background) {
    runBackgroundCommand(parsed.command, parsed.args, parsed.redirects);
  } else {
    runExternalCommand(parsed.command, parsed.args, parsed.redirects);
  }
}

function runBackgroundCommand(command: string, args: string[], redirects: any[]): void {
  const stdio = buildStdio(redirects);

  const child = spawn(command, args, { stdio, detached: false });

  if (!child.pid) {
    console.log(`${command}: command not found`);
    return;
  }

  const job = addJob(child, `${command} ${args.join(" ")}`.trim());
  console.log(`[${job.id}] ${job.pid}`);

  child.on("error", () => {
    console.log(`${command}: command not found`);
  });

  // Close manually-opened fds once the process exits, mirroring runExternalCommand's cleanup
  child.on("exit", () => {
    for (const fd of stdio) {
      if (typeof fd === "number") {
        try { fs.closeSync(fd); } catch {}
      }
    }
  });
}

function runExternalCommand(command: string, args: string[], redirects: any[]): void {
  const stdio = buildStdio(redirects);

  try {
    execFileSync(command, args, { stdio });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log(`${command}: command not found`);
    } else if (err.status !== undefined) {
      // non-zero exit code, nothing more to print
    } else {
      console.log(`${command}: command not found`);
    }
  } finally {
    for (const fd of stdio) {
      if (typeof fd === "number") {
        try { fs.closeSync(fd); } catch {}
      }
    }
  }
}

export function handleArgumentNumber(command: string, args: string[]): boolean {
  const cmd = builtins[command];
  if (!cmd) return true;

  // Skip generic arg-count check for flag-driven builtins —
  // their own execute() handles validation per flag.
  if (cmd.flags) return true;

  if (cmd.minArgs !== undefined && args.length < cmd.minArgs) {
    console.log(`${command}: too few arguments`);
    return false;
  }
  if (cmd.maxArgs !== undefined && cmd.maxArgs !== null && args.length > cmd.maxArgs) {
    console.log(`${command}: too many arguments`);
    return false;
  }
  return true;
}