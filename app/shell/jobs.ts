import { ChildProcess } from "child_process";

export type JobStatus = "running" | "done";

export type Job = {
  id: number;
  pid: number;
  process: ChildProcess;
  command: string;
  status: JobStatus;
};

const jobs: Job[] = [];
let nextJobId = 1;

export function addJob(process: ChildProcess, command: string): Job {
  const job: Job = {
    id: nextJobId++,
    pid: process.pid!,
    process,
    command,
    status: "running",
  };
  jobs.push(job);

  process.on("exit", () => {
    job.status = "done";
  });

  return job;
}

export function listJobs(): Job[] {
  return jobs;
}

export function removeJob(id: number): void {
  const index = jobs.findIndex(j => j.id === id);
  if (index !== -1) jobs.splice(index, 1);
}

// Checks the actual OS-level process state, not just the (possibly delayed)
// "exit" event, to avoid race conditions when reaping right after a command.
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // signal 0 = no-op, just checks existence/permission
    return true;
  } catch {
    return false; // ESRCH (no such process) or EPERM means it's gone (or inaccessible)
  }
}

function refreshJobStatuses(): void {
  for (const job of jobs) {
    if (job.status === "running" && !isProcessAlive(job.pid)) {
      job.status = "done";
    }
  }
}

export function reapDoneJobs(): void {
  refreshJobStatuses();

  const doneJobs = jobs.filter(j => j.status === "done");

  doneJobs.forEach(job => {
    const isCurrent = jobs[jobs.length - 1]?.id === job.id;
    const isPrevious = jobs[jobs.length - 2]?.id === job.id;
    const marker = isCurrent ? "+" : isPrevious ? "-" : " ";

    console.log(`[${job.id}]${marker}  Done                    ${job.command}`);
  });

  doneJobs.forEach(job => removeJob(job.id));
}