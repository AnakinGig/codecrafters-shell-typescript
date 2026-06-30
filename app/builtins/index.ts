import { type Builtin } from "../shell/types";

import { echo } from "./echo";
import { exit } from "./exit";
import { pwd } from "./pwd";
import { type } from "./type";
import { cd } from "./cd";
import { complete } from "./complete";
import { args } from "./args";
import { jobs } from "./jobs";

export const builtins: Record<string, Builtin> = {
  exit,
  echo,
  type,
  pwd,
  cd,
  complete,
  args,
  jobs
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