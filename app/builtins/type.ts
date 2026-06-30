import { type Builtin } from "../shell/types";
import { findExecutableInPath } from "../utils/path";
import { builtins } from ".";

export const type: Builtin = {
  minArgs: 1,
  maxArgs: 1,
  execute: (args) => {
    if (args[0] in builtins) {
      console.log(`${args[0]} is a shell builtin`);
      return;
    }
    
    const executable = findExecutableInPath(args[0]);
    if (executable) {
      console.log(`${args[0]} is ${executable}`);
      return;
    }
    console.log(`${args[0]}: not found`);
  }
}