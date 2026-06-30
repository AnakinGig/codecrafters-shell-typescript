export type Redirect = {
  type: "stdout" | "stdin" | "stderr";
  append?: boolean;
  file: string;
};

export type ParsedCommand = {
  command: string;
  args: string[];
  redirects: Redirect[];
  background: boolean;
};

export type FlagSpec = {
  argCount: number;
  handler: (args: string[]) => void;
};

export type Builtin = {
  // Optional, only useful for simple flag-less builtins (echo, pwd, cd...)
  minArgs?: number;
  maxArgs?: number | null;
  // Optional, only used by flag-driven builtins
  flags?: Record<string, FlagSpec>;
  execute(args: string[], redirects: Redirect[]): void;
};