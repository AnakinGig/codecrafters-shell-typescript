import { type Builtin } from "../shell/types";
import { listJobs, removeJob, refreshJobStatuses } from "../shell/jobs";

export const jobs: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: () => {
    refreshJobStatuses();

    const allJobs = listJobs(); // already in creation order
    const toRemove: number[] = [];

    allJobs.forEach((job, index) => {
      const isCurrent = index === allJobs.length - 1;
      const isPrevious = index === allJobs.length - 2;
      const marker = isCurrent ? "+" : isPrevious ? "-" : " ";

      if (job.status === "done") {
        console.log(`[${job.id}]${marker}  Done                    ${job.command}`);
        toRemove.push(job.id);
      } else {
        console.log(`[${job.id}]${marker}  Running                 ${job.command} &`);
      }
    });

    toRemove.forEach(removeJob);
  }
};