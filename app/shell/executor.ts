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

  let child;
  try {
    child = spawn(command, args, { stdio, detached: false });
  } catch (err: any) {
    console.log(`${command}: command not found`);
    closeFds(stdio);
    return;
  }

  child.on("error", (err: any) => {
    if (err.code === "ENOENT") {
      console.log(`${command}: command not found`);
    } else {
      console.log(`${command}: ${err.message}`);
    }
    closeFds(stdio);
  });

  child.on("exit", () => {
    closeFds(stdio);
  });

  // pid may be undefined immediately after a failed spawn on some platforms,
  // so don't print the job line until we're sure the process actually started.
  if (!child.pid) {
    return;
  }

  const job = addJob(child, `${command} ${args.join(" ")}`.trim());
  console.log(`[${job.id}] ${job.pid}`);
}

function closeFds(stdio: ("inherit" | number)[]): void {
  for (const fd of stdio) {
    if (typeof fd === "number") {
      try { fs.closeSync(fd); } catch {}
    }
  }
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