import { type Builtin } from "../shell/types";
import { getVariable, hasVariable, setVariable, getAllVariables } from "../shell/variables";
import { executeWithFlags } from "../shell/flags";

export const declare: Builtin = {
  flags: {
    "-p": {
      argCount: 1,
      handler: ([name]) => {
        if (!hasVariable(name)) {
          console.log(`bash: declare: ${name}: not found`);
          return;
        }
        console.log(`declare -- ${name}="${getVariable(name)}"`);
      }
    }
  },
  execute: (args) => {
    // No flag: declare NAME=value, or bare `declare -p` to list all
    if (args.length === 1 && args[0] === "-p") {
      const all = getAllVariables();
      Object.keys(all).sort().forEach(name => {
        console.log(`declare -- ${name}="${all[name]}"`);
      });
      return;
    }

    if (args.length > 0 && args[0].startsWith("-")) {
      executeWithFlags("declare", args, declare.flags!);
      return;
    }

    // Plain assignment(s): declare NAME=value
    for (const arg of args) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex === -1) {
        setVariable(arg, "");
      } else {
        const name = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        setVariable(name, value);
      }
    }
  }
};