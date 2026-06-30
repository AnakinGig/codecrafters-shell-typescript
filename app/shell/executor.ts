import fs from "fs";
import child_process from "child_process";

import { type ParsedCommand, type Redirect } from "./types";
import { buildStdio } from "./redirects";
import { builtins } from "../builtins";

export function executeCommand(parsed: ParsedCommand): void {
  const builtin = builtins[parsed.command];

  if (builtin) {
    builtin.execute(parsed.args, parsed.redirects);
  } else {
    runExternalCommand(parsed.command, parsed.args, parsed.redirects);
  }
}

function runExternalCommand(command: string, args: string[], redirects: Redirect[]): void {
  const stdio = buildStdio(redirects);

  try {
    child_process.execFileSync(command, args, { stdio });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log(`${command}: command not found`);
    } else if (err.status !== undefined) {
      // The command was found but exited with a non-zero status code
    } else {
      console.log(`${command}: command not found`);
    }
  } finally {
    // close the file descriptors if they were opened
    for (const fd of stdio) {
      if (typeof fd === "number") {
        try { fs.closeSync(fd); } catch {}
      }
    }
  }
}

export function handleArgumentNumber(command: string, args: string[]): boolean {
  // Tell if builtin command has too many or too few arguments
  const cmd = builtins[command];

  if (!cmd) return true; // Not a builtin command, let the OS handle it

  if (args.length < cmd.minArgs) {
    console.log(`${command}: too few arguments`);
    return false;
  }
  if (cmd.maxArgs !== null && args.length > cmd.maxArgs) {
    console.log(`${command}: too many arguments`);
    return false;
  }
  return true;
}