import { type Builtin } from "../shell/types";
import { writeHistoryToFile } from "../shell/history";
import { rl } from "../index";

export const exit: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: (args, redirects) => {
    if (process.env.HISTFILE) {
      writeHistoryToFile(process.env.HISTFILE);
    }
    rl.close();
    process.exit(0);
  }
};