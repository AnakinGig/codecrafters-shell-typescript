import { type Builtin } from "../shell/types";
import { listJobs, reapDoneJobs } from "../shell/jobs";

export const jobs: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: () => {
    // First, reap and display any jobs that have finished
    reapDoneJobs();

    // Then show the remaining running jobs
    const allJobs = listJobs();
    allJobs.forEach((job, index) => {
      const isCurrent = index === allJobs.length - 1;
      const isPrevious = index === allJobs.length - 2;
      const marker = isCurrent ? "+" : isPrevious ? "-" : " ";

      console.log(`[${job.id}]${marker}  Running                 ${job.command} &`);
    });
  }
};