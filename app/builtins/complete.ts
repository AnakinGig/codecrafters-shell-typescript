import { type Builtin } from "../shell/types";
import { executeWithFlags } from "../shell/flags";

type CompletionSpec = {
  type: "C"; // could extend later with "F", "W", etc.
  value: string; // the program/path used for -C
};

const completions: Record<string, CompletionSpec> = {};

export function getCompletionSpec(command: string): CompletionSpec | undefined {
  return completions[command];
}

export const complete: Builtin = {
  flags: {
    "-p": {
      argCount: 1,
      handler: ([command]) => {
        const spec = completions[command];
        if (!spec) {
          console.log(`complete: ${command}: no completion specification`);
          return;
        }
        console.log(`complete -${spec.type} '${spec.value}' ${command}`);
      }
    },
    "-C": {
      argCount: 2,
      handler: ([path, command]) => {
        completions[command] = { type: "C", value: path };
      }
    }
  },
  execute: (args) => {
    executeWithFlags("complete", args, complete.flags!);
  }
}