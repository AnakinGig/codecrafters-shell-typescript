import { type Builtin } from "../shell/types";
import { getVariable, hasVariable, setVariable, getAllVariables } from "../shell/variables";
import { executeWithFlags } from "../shell/flags";

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

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
      const name = eqIndex === -1 ? arg : arg.slice(0, eqIndex);
      const value = eqIndex === -1 ? "" : arg.slice(eqIndex + 1);

      if (!VALID_IDENTIFIER.test(name)) {
        console.log(`declare: \`${arg}': not a valid identifier`);
        continue;
      }

      setVariable(name, value);
    }
  }
};