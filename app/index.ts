import { createInterface } from "readline";

import { parseCommandLine } from "./shell/parser";
import { completer } from "./shell/completion";
import { handleArgumentNumber } from "./builtins";
import { executeCommand } from "./shell/executor";
import { reapDoneJobs } from "./shell/jobs";

export const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer,
});

reapDoneJobs();
rl.prompt();

rl.on("line", (line) => {

  const parsed = parseCommandLine(line);

  if (!parsed.command) {
    reapDoneJobs();
    rl.prompt();
    return;
  }

  if (!handleArgumentNumber(parsed.command, parsed.args)) {
    reapDoneJobs();
    rl.prompt();
    return;
  }

  executeCommand(parsed);

  reapDoneJobs();
  rl.prompt();
});