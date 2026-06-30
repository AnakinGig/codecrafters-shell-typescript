import { ChildProcess } from "child_process";

export type Job = {
  id: number;
  pid: number;
  process: ChildProcess;
  command: string;
};

const jobs: Job[] = [];
let nextJobId = 1;

export function addJob(process: ChildProcess, command: string): Job {
  const job: Job = {
    id: nextJobId++,
    pid: process.pid!,
    process,
    command,
  };
  jobs.push(job);

  // Clean up from the list once the process exits
  process.on("exit", () => {
    const index = jobs.findIndex(j => j.id === job.id);
    if (index !== -1) jobs.splice(index, 1);
  });

  return job;
}

export function listJobs(): Job[] {
  return jobs;
}