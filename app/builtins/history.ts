import { type Builtin } from "../shell/types";
import { getHistory, loadHistoryFromFile } from "../shell/history";
import { executeWithFlags } from "../shell/flags";

export const history: Builtin = {
  flags: {
    "-r": {
      argCount: 1,
      handler: ([path]) => {
        loadHistoryFromFile(path);
      }
    }
  },
  execute: (args) => {
    // No flag: plain `history` or `history <n>`
    if (args.length === 0 || /^\d+$/.test(args[0])) {
      const entries = getHistory();

      let startIndex = 0;
      if (args.length === 1) {
        const n = parseInt(args[0], 10);
        if (!isNaN(n) && n > 0) {
          startIndex = Math.max(0, entries.length - n);
        }
      }

      entries.slice(startIndex).forEach((entry, index) => {
        const lineNumber = startIndex + index + 1;
        console.log(`${String(lineNumber).padStart(5)}  ${entry}`);
      });
      return;
    }

    // Otherwise, dispatch to flags (-r, etc.)
    executeWithFlags("history", args, history.flags!);
  }
};