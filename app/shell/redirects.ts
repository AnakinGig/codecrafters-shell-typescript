import fs from "fs";

import { type Redirect } from "../shell/types";

export function buildStdio(redirects: Redirect[]): ["inherit" | number, "inherit" | number, "inherit" | number] {
  const stdio: ("inherit" | number)[] = ["inherit", "inherit", "inherit"];

  for (const redirect of redirects) {
    const flag = redirect.append ? "a" : "w";
    if (redirect.type === "stdout") {
      const fd = fs.openSync(redirect.file, flag);
      stdio[1] = fd;
    } else if (redirect.type === "stderr") {
      const fd = fs.openSync(redirect.file, flag);
      stdio[2] = fd;
    }
  }

  return stdio as ["inherit" | number, "inherit" | number, "inherit" | number];
}