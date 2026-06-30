import { type FlagSpec } from "./types";

export function executeWithFlags(command: string, args: string[], flags: Record<string, FlagSpec>): void {
  const [flag, ...rest] = args;

  if (!flag) {
    console.log(`${command}: missing flag`);
    return;
  }

  const spec = flags[flag];
  if (!spec) {
    console.log(`${command}: unknown flag ${flag}`);
    return;
  }

  if (rest.length < spec.argCount) {
    console.log(`${command}: ${flag} requires ${spec.argCount} argument(s)`);
    return;
  }

  spec.handler(rest.slice(0, spec.argCount));
}