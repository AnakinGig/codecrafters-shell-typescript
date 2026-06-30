import fs from "fs";

export function findExecutableInPath(command: string): string | null {
  if (!process.env.PATH) {
    return null;
  }

  const pathDirs: string[] = process.env.PATH.split(":");
  for (const dir of pathDirs) {
    const commandPath: string = `${dir}/${command}`;
    try {
      fs.accessSync(commandPath, fs.constants.X_OK);
      return commandPath;
    } catch (err: any) {
      // command not found in this directory, continue searching
    }
  }
  return null;
}

export function getExecutablesInPath(prefix = ""): string[] {
  if (!process.env.PATH) {
    return [];
  }

  const executables = new Set<string>();

  for (const dir of process.env.PATH.split(":")) {
    let entries: string[];

    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.startsWith(prefix)) {
        continue;
      }

      try {
        fs.accessSync(`${dir}/${entry}`, fs.constants.X_OK);
        executables.add(entry);
      } catch {}
    }
  }

  return [...executables].sort();
}