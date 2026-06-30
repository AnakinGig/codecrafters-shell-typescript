import { type Builtin } from "../shell/types";

export const complete: Builtin = {
  minArgs: 2,
  maxArgs: 3,
  execute: (args) => {
    if (args[0] === "-p") {
      const command = args[1];
      const completions = (globalThis as any).completions?.[command] || [];
      if (completions.length === 0) {
        console.log(`complete: ${command}: no completion specification`);
        return;
      }
      console.log(completions.join("\n"));
    }
  }
}