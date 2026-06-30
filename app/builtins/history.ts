import { type Builtin } from "../shell/types";
import { getHistory } from "../shell/history";

export const history: Builtin = {
  flags: {
    "-r":{
      argCount: 1,
      handler: ([path]) => {
        loadHistoryFromFile(path);
    }
  },
  execute: (args) => {
    const entries = getHistory();

    let startIndex = 0;
    if (args.length === 1) {
      const num = args[0];
      const n = parseInt(num, 10);
      if (!isNaN(n) && n > 0) {
        startIndex = Math.max(0, entries.length - n);
      }
    }

    entries.slice(startIndex).forEach((entry, index) => {
      const lineNumber = startIndex + index + 1;
      // Right-align the number in a 4-char-wide column, like bash's `history`
      console.log(`${String(lineNumber).padStart(5)}  ${entry}`);
    });
  }
}