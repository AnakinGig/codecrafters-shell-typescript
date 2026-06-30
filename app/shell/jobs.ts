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

export function addJob(process: ChildProcess, command: string): Job {
  const job: Job = {
    id: allocateJobId(),
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

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function refreshJobStatuses(): void {
  for (const job of jobs) {
    if (job.status === "running" && !isProcessAlive(job.pid)) {
      job.status = "done";
    }
  }
}

function allocateJobId(): number {
  if (jobs.length === 0) return 1;
  return jobs[jobs.length - 1].id + 1;
}

// Used by the automatic pre-prompt hook: prints Done jobs and removes them.
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