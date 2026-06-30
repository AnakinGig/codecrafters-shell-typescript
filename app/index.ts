import { createInterface } from "readline";

import { parseCommandLine } from "./shell/parser";
import { completer } from "./shell/completion";
import { handleArgumentNumber } from "./builtins";
import { executePipeline } from "./shell/executor";
import { reapDoneJobs } from "./shell/jobs";

export const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer,
});

reapDoneJobs();
rl.prompt();

rl.on("line", async (line) => {

  const pipeline = parseCommandLine(line);

  if (!pipeline) {
    reapDoneJobs();
    rl.prompt();
    return;
  }

  if (!handleArgumentNumber(pipeline.stages[0].command, pipeline.stages[0].args)) {
    reapDoneJobs();
    rl.prompt();
    return;
  }

  await executePipeline(pipeline);

  reapDoneJobs();
  rl.prompt();
});