import { execFileSync, spawn, ChildProcess } from "child_process";
import fs from "fs";

import { type ParsedCommand, type ParsedPipeline } from "./types";
import { buildStdio } from "./redirects";
import { builtins } from "../builtins";
import { addJob } from "./jobs";

export function executePipeline(pipeline: ParsedPipeline): void {
  const { stages, background } = pipeline;

  if (stages.length === 0) return;

  if (stages.length === 1) {
    executeSingle(stages[0], background);
    return;
  }

  runPipeline(stages, background);
}

function executeSingle(parsed: ParsedCommand, background: boolean): void {
  const builtin = builtins[parsed.command];

  if (builtin) {
    builtin.execute(parsed.args, parsed.redirects);
    return;
  }

  if (background) {
    runBackgroundCommand(parsed.command, parsed.args, parsed.redirects);
  } else {
    runExternalCommand(parsed.command, parsed.args, parsed.redirects);
  }
}

function runPipeline(stages: ParsedCommand[], background: boolean): void {
  const children: ChildProcess[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const isFirst = i === 0;
    const isLast = i === stages.length - 1;

    // stdin: "pipe" if not first (connected to previous stage), else inherit
    // stdout: "pipe" if not last (connected to next stage), else from redirects/inherit
    const stdio: ("inherit" | "pipe" | number)[] = ["inherit", "inherit", "inherit"];

    stdio[0] = isFirst ? "inherit" : "pipe";
    stdio[1] = isLast ? "inherit" : "pipe";

    // Apply redirects only where they make sense (stdout redirect on last stage,
    // stderr redirect can apply to any stage since each writes its own stderr)
    for (const redirect of stage.redirects) {
      const flag = redirect.append ? "a" : "w";
      if (redirect.type === "stdout" && isLast) {
        stdio[1] = fs.openSync(redirect.file, flag);
      } else if (redirect.type === "stderr") {
        stdio[2] = fs.openSync(redirect.file, flag);
      }
    }

    const child = spawn(stage.command, stage.args, { stdio: stdio as any });
    children.push(child);

    child.on("error", () => {
      console.log(`${stage.command}: command not found`);
    });

    // Connect this stage's stdout to the next stage's stdin
    if (!isFirst) {
      const prevChild = children[i - 1];
      if (prevChild.stdout && child.stdin) {
        prevChild.stdout.pipe(child.stdin);
      }
    }
  }

  if (background) {
    const job = addJob(children[children.length - 1], stages.map(s => `${s.command} ${s.args.join(" ")}`).join(" | "));
    console.log(`[${job.id}] ${job.pid}`);
    return;
  }

  // Wait for the last process in the pipeline to finish (foreground case)
  const last = children[children.length - 1];
  const { spawnSync } = require("child_process");
  waitForExit(last);
}

function waitForExit(child: ChildProcess): void {
  // Block synchronously using Atomics, or use a busy-wait fallback.
  // Simplest portable approach: use deasync-like spin via child_process semantics
  // is not native to Node; instead we rely on the event loop and a synchronous
  // wait helper.
  const { execSync } = require("child_process");
  if (child.pid) {
    try {
      execSync(`wait ${child.pid} 2>/dev/null`, { stdio: "ignore" });
    } catch {
      // fallback: poll until process is gone
    }
  }
}

function runBackgroundCommand(command: string, args: string[], redirects: any[]): void {
  const stdio = buildStdio(redirects);

  let child: ChildProcess;
  try {
    child = spawn(command, args, { stdio });
  } catch {
    console.log(`${command}: command not found`);
    return;
  }

  child.on("error", () => {
    console.log(`${command}: command not found`);
  });

  if (!child.pid) return;

  const job = addJob(child, `${command} ${args.join(" ")}`.trim());
  console.log(`[${job.id}] ${job.pid}`);

  child.on("exit", () => closeFds(stdio));
}

function runExternalCommand(command: string, args: string[], redirects: any[]): void {
  const stdio = buildStdio(redirects);

  try {
    execFileSync(command, args, { stdio });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log(`${command}: command not found`);
    } else if (err.status === undefined) {
      console.log(`${command}: command not found`);
    }
  } finally {
    closeFds(stdio);
  }
}

function closeFds(stdio: ("inherit" | number)[]): void {
  for (const fd of stdio) {
    if (typeof fd === "number") {
      try { fs.closeSync(fd); } catch {}
    }
  }
}