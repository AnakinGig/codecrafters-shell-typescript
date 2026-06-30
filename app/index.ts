import { createInterface } from "readline";
import os from "os";

import { parseCommandLine } from "./shell/parser";
import { completer } from "./shell/completion";
import { handleArgumentNumber } from "./builtins";
import { executePipeline } from "./shell/executor";
import { reapDoneJobs } from "./shell/jobs";
import { addToHistory, appendHistoryToFile, loadHistoryFromFile } from "./shell/history";
import { buildBanner } from "./banner";

const reset = "\x1b[0m";
const green = "\x1b[32m";
const blue = "\x1b[34m";
const cyan = "\x1b[36m";

function updatePrompt() {
  let cwd = process.cwd();
  if (cwd.startsWith(os.homedir())) {
    cwd = `~${cwd.slice(os.homedir().length)}`;
  }
  if (cwd.startsWith("/mnt/c")) {
    cwd = cwd.replace("/mnt/c", "C:");
  }
  rl.setPrompt(`${green}${os.userInfo().username}@${os.hostname()}(${cyan}${cwd}${reset}$ `);
}

export const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  completer,
});

// banner
console.log(await buildBanner());

// Load history from HISTFILE on startup, if set
if (process.env.HISTFILE) {
  loadHistoryFromFile(process.env.HISTFILE);
}

reapDoneJobs();
updatePrompt();
rl.prompt();

rl.on("line", async (line) => {
  addToHistory(line);
  const pipeline = parseCommandLine(line);

  if (!pipeline || pipeline.stages.length === 0) {
    reapDoneJobs();
    updatePrompt();
    rl.prompt();
    return;
  }

  if (!handleArgumentNumber(pipeline.stages[0].command, pipeline.stages[0].args)) {
    reapDoneJobs();
    updatePrompt();
    rl.prompt();
    return;
  }

  await executePipeline(pipeline);

  reapDoneJobs();
  updatePrompt();
  rl.prompt();
});

// Save on close
rl.on("close", () => {
  if (process.env.HISTFILE) {
    appendHistoryToFile(process.env.HISTFILE);
  }
  process.exit(0);
});