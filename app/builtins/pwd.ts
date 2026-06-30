import { type Builtin } from "../shell/types";

export const pwd: Builtin = {
  minArgs: 0,
  maxArgs: 0,
  execute: () => {
    console.log(process.cwd());
  }
}