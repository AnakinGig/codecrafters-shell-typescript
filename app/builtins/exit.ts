import { type Builtin } from "../shell/types";
import { appendHistoryToFile } from "../shell/history";
import { rl } from "../index";

export const exit: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: () => {
    if (process.env.HISTFILE) {
      appendHistoryToFile(process.env.HISTFILE);
    }
    rl.close();
    process.exit(0);
  }
};