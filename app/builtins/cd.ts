import os from "os";

import { type Builtin } from "../shell/types";

export const cd: Builtin = {
  minArgs: 0,
  maxArgs: 1,
  execute: (args) => {
    try {
      let path = args[0] || os.homedir();
      if (path.startsWith("~")) {
        path = path.replace("~", os.homedir());
      }
      process.chdir(path);
    } catch (err: any) {
      console.log(`cd: ${args[0]}: No such file or directory`);
    }
  }
}