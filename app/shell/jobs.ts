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

// Finds all "done" jobs, prints a Done line for each, and removes them.
export function reapDoneJobs(): void {
  const doneJobs = jobs.filter(j => j.status === "done");

  doneJobs.forEach((job, index) => {
    const isCurrent = jobs[jobs.length - 1]?.id === job.id;
    const isPrevious = jobs[jobs.length - 2]?.id === job.id;
    const marker = isCurrent ? "+" : isPrevious ? "-" : " ";

    console.log(`[${job.id}]${marker}  Done                    ${job.command}`);
  });

  doneJobs.forEach(job => removeJob(job.id));
}