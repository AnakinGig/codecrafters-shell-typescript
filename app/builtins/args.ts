import { type Builtin } from "../shell/types";

export const args: Builtin = {
  minArgs: 1,
  maxArgs: null,
  execute: (args) => {
    console.log(args);
  }
}