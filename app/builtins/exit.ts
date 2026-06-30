import { type Builtin } from "../shell/types";

export const exit: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: (args, redirects) => {
    process.exit(0);
  }
};