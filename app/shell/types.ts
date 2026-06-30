export type Redirect = {
  type: "stdout" | "stdin" | "stderr";
  append?: boolean;
  file: string;
};

export type ParsedCommand = {
  command: string;
  args: string[];
  redirects: Redirect[];
};

export type Builtin = {
  minArgs: number;
  maxArgs: number | null;
  execute(args: string[], redirects: Redirect[]): void;
};