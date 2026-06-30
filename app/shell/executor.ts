import { spawn, ChildProcess } from "child_process";
import { Readable } from "stream";
import fs from "fs";

import { type ParsedCommand, type ParsedPipeline } from "./types";
import { buildStdio } from "./redirects";
import { builtins } from "../builtins";
import { addJob } from "./jobs";

export async function executePipeline(pipeline: ParsedPipeline): Promise<void> {
  const { stages, background } = pipeline;
  if (stages.length === 0) return;

  if (stages.length === 1) {
    await executeSingle(stages[0], background);
    return;
  }

  await runPipeline(stages, background);
}

async function executeSingle(parsed: ParsedCommand, background: boolean): Promise<void> {
  const builtin = builtins[parsed.command];
  if (builtin) {
    builtin.execute(parsed.args, parsed.redirects);
    return;
  }
  if (background) {
    runBackgroundCommand(parsed.command, parsed.args, parsed.redirects);
    return;
  }
  await runExternalCommand(parsed.command, parsed.args, parsed.redirects);
}

// Captures everything a builtin writes via console.log/process.stdout.write
// and returns it as a single string.
function captureBuiltinOutput(stage: ParsedCommand): string {
  const builtin = builtins[stage.command];
  let captured = "";

  const originalWrite = process.stdout.write.bind(process.stdout);
  const originalLog = console.log;

  process.stdout.write = ((chunk: any) => {
    captured += chunk.toString();
    return true;
  }) as any;
  console.log = (...args: any[]) => {
    captured += args.join(" ") + "\n";
  };

  try {
    builtin.execute(stage.args, stage.redirects);
  } finally {
    process.stdout.write = originalWrite;
    console.log = originalLog;
  }

  return captured;
}

async function runPipeline(stages: ParsedCommand[], background: boolean): Promise<void> {
  // 1. Run all builtin stages immediately, capturing their output as strings.
  //    External stages remain unspawned for now.
  const stageOutputs: (string | null)[] = stages.map(stage =>
    builtins[stage.command] ? captureBuiltinOutput(stage) : null
  );

  // 2. Spawn external stages, feeding them either the previous builtin's
  //    captured output (written then ended) or piping from the previous
  //    external child's stdout.
  const children: (ChildProcess | null)[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const isFirst = i === 0;
    const isLast = i === stages.length - 1;

    if (builtins[stage.command]) {
      children.push(null);
      continue;
    }

    const stdio: ("inherit" | "pipe" | number)[] = ["inherit", "inherit", "inherit"];
    stdio[0] = isFirst ? "inherit" : "pipe";
    stdio[1] = isLast ? "inherit" : "pipe";

    for (const redirect of stage.redirects) {
      const flag = redirect.append ? "a" : "w";
      if (redirect.type === "stdout" && isLast) {
        stdio[1] = fs.openSync(redirect.file, flag);
      }
      if (redirect.type === "stderr") {
        stdio[2] = fs.openSync(redirect.file, flag);
      }
    }

    const child = spawn(stage.command, stage.args, { stdio: stdio as any });
    children.push(child);

    child.on("error", () => {
      console.log(`${stage.command}: command not found`);
    });

    if (!isFirst && child.stdin) {
      const prevOutput = stageOutputs[i - 1];
      if (prevOutput !== null) {
        // Previous stage was a builtin: feed its captured output directly
        child.stdin.write(prevOutput);
        child.stdin.end();
      } else {
        const prevChild = children[i - 1];
        if (prevChild?.stdout) {
          prevChild.stdout.pipe(child.stdin);
        }
      }
    }
  }

  // 3. If the LAST stage is a builtin, its output was already captured
  //    and needs to be printed now (since it can't read external stdin anyway,
  //    its captured output IS the final output to print).
  const lastIndex = stages.length - 1;
  if (builtins[stages[lastIndex].command]) {
    const output = stageOutputs[lastIndex];
    if (output !== null) process.stdout.write(output);
  }

  if (background) {
    const lastChild = children[children.length - 1];
    if (lastChild) {
      const job = addJob(
        lastChild,
        stages.map(s => `${s.command} ${s.args.join(" ")}`).join(" | ")
      );
      console.log(`[${job.id}] ${job.pid}`);
    }
    return;
  }

  const lastChild = children[children.length - 1];
  if (lastChild) {
    await new Promise<void>(resolve => {
      lastChild.once("exit", resolve);
      lastChild.once("error", resolve);
    });
  }
}

function runBackgroundCommand(command: string, args: string[], redirects: any[]): void {
  const stdio = buildStdio(redirects);
  const child = spawn(command, args, { stdio });

  child.on("error", () => {
    console.log(`${command}: command not found`);
    closeFds(stdio);
  });

  if (!child.pid) return;

  const job = addJob(child, `${command} ${args.join(" ")}`.trim());
  console.log(`[${job.id}] ${job.pid}`);

  child.on("exit", () => closeFds(stdio));
}

function runExternalCommand(command: string, args: string[], redirects: any[]): Promise<void> {
  return new Promise(resolve => {
    const stdio = buildStdio(redirects);
    const child = spawn(command, args, { stdio });

    child.once("error", () => {
      console.log(`${command}: command not found`);
      closeFds(stdio);
      resolve();
    });

    child.once("exit", () => {
      closeFds(stdio);
      resolve();
    });
  });
}

function closeFds(stdio: ("inherit" | number)[]): void {
  for (const fd of stdio) {
    if (typeof fd === "number") {
      try { fs.closeSync(fd); } catch {}
    }
  }
}