import { type Builtin } from "../shell/types";
import { listJobs, removeJob } from "../shell/jobs";

export const jobs: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: () => {
    const allJobs = listJobs();

    if (allJobs.length === 0) {
      return;
    }

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

    // Remove completed jobs
    toRemove.forEach((id) => removeJob(id));
  }
}