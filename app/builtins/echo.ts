import fs from "fs";

import { type Builtin } from "../shell/types";

export const echo: Builtin = {
  minArgs: 1,
  maxArgs: null,
  execute: (args, redirects) => {
    const output = args.join(" ");
  
    const stdoutRedirect = redirects.find(r => r.type === "stdout");
    const stderrRedirect = redirects.find(r => r.type === "stderr");
  
    if (stderrRedirect) {
      try {
        fs.writeFileSync(stderrRedirect.file, "", { flag: stderrRedirect.append ? "a" : "w" });
      } catch (err: any) {
        console.log(`Error writing to file ${stderrRedirect.file}: ${err.message}`);
      }
    }
  
    if (stdoutRedirect) {
      try {
        fs.writeFileSync(stdoutRedirect.file, output + "\n", { flag: stdoutRedirect.append ? "a" : "w" });
      } catch (err: any) {
        console.log(`Error writing to file ${stdoutRedirect.file}: ${err.message}`);
      }
    } else {
      console.log(output);
    }
  }
}