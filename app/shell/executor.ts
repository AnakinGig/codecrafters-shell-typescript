import { spawn, ChildProcess } from "child_process";
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

async function executeSingle(
  parsed: ParsedCommand,
  background: boolean
): Promise<void> {
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

async function runPipeline(
  stages: ParsedCommand[],
  background: boolean
): Promise<void> {
  const children: ChildProcess[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const isFirst = i === 0;
    const isLast = i === stages.length - 1;

    const stdio: ("inherit" | "pipe" | number)[] = [
      "inherit",
      "inherit",
      "inherit",
    ];

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

    const child = spawn(stage.command, stage.args, {stdio: stdio as any});

    children.push(child);

    child.on("error", () => {
      console.log(`${stage.command}: command not found`);
    });

    if (!isFirst) {
      const previous = children[i - 1];

      if (previous.stdout && child.stdin) previous.stdout.pipe(child.stdin);
    }
  }

  if (background) {
    const job = addJob(
      children[children.length - 1],
      stages.map(s => `${s.command} ${s.args.join(" ")}`).join(" | ")
    );

    console.log(`[${job.id}] ${job.pid}`);
    return;
  }

  const last = children[children.length - 1];

  await new Promise<void>(resolve => {
    last.once("exit", resolve);
    last.once("error", resolve);
  });
}

function runBackgroundCommand(
  command: string,
  args: string[],
  redirects: any[]
): void {
  const stdio = buildStdio(redirects);

  const child = spawn(command, args, { stdio });

  child.on("error", () => {
    console.log(`${command}: command not found`);
    closeFds(stdio);
  });

  if (!child.pid) return;

  const job = addJob(child,`${command} ${args.join(" ")}`.trim());

  console.log(`[${job.id}] ${job.pid}`);

  child.on("exit", () => {
    closeFds(stdio);
  });
}

function runExternalCommand(
  command: string,
  args: string[],
  redirects: any[]
): Promise<void> {
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
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}