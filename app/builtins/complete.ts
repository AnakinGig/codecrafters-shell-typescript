import { type Builtin } from "../shell/types";
import { executeWithFlags } from "../shell/flags";

export const complete: Builtin = {
  flags: {
    "-p": {
      argCount: 1,
      handler: ([command]) => {
        const completions = (globalThis as any).completions?.[command] || [];
        if (completions.length === 0) {
          console.log(`complete: ${command}: no completion specification`);
          return;
        }
        console.log(completions.join("\n"));
      }
    },
    "-C": {
      argCount: 2,
      handler: ([path, command]) => {
        // Implementation for -C flag to register a completion specification for a command
        if (!(globalThis as any).completions) {
          (globalThis as any).completions = {};
        }
        (globalThis as any).completions[command] = [path];
      }
    }
  },
  execute: (args) => {
    executeWithFlags("complete", args, complete.flags!);
  }
}