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
    status: "running"
  };
  jobs.push(job);

  // Clean up from the list once the process exits
  process.on("exit", () => {
    job.status = "done";
  });

  return job;
}

export function listJobs(): Job[] {
  return jobs;
}

export function removeJob(id: number): void {
  const index = jobs.findIndex(job => job.id === id);
  if (index !== -1) {
    jobs.splice(index, 1);
  }
}