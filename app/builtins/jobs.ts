import { type Builtin } from "../shell/types";
import { listJobs } from "../shell/jobs";

export const jobs: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: () => {
    const allJobs = listJobs();

    if (allJobs.length === 0) {
      return;
    }

    allJobs.forEach((job, index) => {
      const isCurrent = index === allJobs.length - 1;
      const isPrevious = index === allJobs.length - 2;
      const marker = isCurrent ? "+" : isPrevious ? "-" : " ";

      console.log(`[${job.id}]${marker}  Running                 ${job.command} &`);
    });
  }
}