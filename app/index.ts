import { createInterface } from "readline";

import { parseCommandLine } from "./shell/parser";
import { completer } from "./shell/completion";
import { handleArgumentNumber } from "./builtins";
import { executeCommand } from "./shell/executor";

export const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer,
});

rl.prompt();

rl.on("line", (line) => {

  const parsed = parseCommandLine(line);

  if (!parsed.command) {
    rl.prompt();
    return;
  }

  if (!handleArgumentNumber(parsed.command, parsed.args)) {
    rl.prompt();
    return;
  }

  executeCommand(parsed);

  rl.prompt();
});