import { createInterface } from "readline";

import { parseCommandLine } from "./shell/parser";
import { completer } from "./shell/completion";
import { handleArgumentNumber } from "./builtins";
import { executePipeline } from "./shell/executor";
import { reapDoneJobs } from "./shell/jobs";
import { addToHistory, loadHistoryFromFile, writeHistoryToFile } from "./shell/history";

export const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
  completer,
});

// Load history from HISTFILE on startup, if set
if (process.env.HISTFILE) {
  loadHistoryFromFile(process.env.HISTFILE);
}

reapDoneJobs();
rl.prompt();

rl.on("line", async (line) => {
  addToHistory(line);
  const pipeline = parseCommandLine(line);

  if (!pipeline || pipeline.stages.length === 0) {
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

// Save on close
rl.on("close", () => {
  if (process.env.HISTFILE) {
    writeHistoryToFile(process.env.HISTFILE);
  }
  process.exit(0);
});