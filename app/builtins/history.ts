import { type Builtin } from "../shell/types";
import { getHistory } from "../shell/history";

export const history: Builtin = {
  minArgs: 0,
  maxArgs: 1,
  execute: ([num]) => {
    const entries = getHistory();

    let startIndex = 0;
    if (num.length === 1) {
      const n = parseInt(num[0], 10);
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