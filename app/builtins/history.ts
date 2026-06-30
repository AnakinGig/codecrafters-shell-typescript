import { type Builtin } from "../shell/types";
import { getHistory } from "../shell/history";

export const history: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: () => {
    const entries = getHistory();

    entries.forEach((entry, index) => {
      const lineNumber = index + 1;
      // Right-align the number in a 4-char-wide column, like bash's `history`
      console.log(`${String(lineNumber).padStart(5)}  ${entry}`);
    });
  }
}