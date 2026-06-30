import { type ParsedCommand, type Redirect } from "./types";

export function parseCommandLine(line: string): ParsedCommand {
  const tokens: string[] = [];
  const redirects: Redirect[] = [];
  let current = "";

  let quoteMode: "none" | "single" | "double" = "none";
  let escaped = false;
  let redirectType: "stdout" | "stderr" | null = null;
  let redirectAppend = false;

  const trimmed = line.trim();

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (quoteMode === "none") {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
    }

    if (quoteMode === "double") {
      if (escaped) {
        if (char === "\\" || char === "$" || char === '"' || char === "`") {
          current += char;
        } else {
          current += "\\" + char;
        }
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
    }

    if (char === "'" && quoteMode !== "double") {
      quoteMode = quoteMode === "single" ? "none" : "single";
      continue;
    }

    if (char === '"' && quoteMode !== "single") {
      quoteMode = quoteMode === "double" ? "none" : "double";
      continue;
    }

    if (quoteMode === "none" && char === ">") {
      let fd: "stdout" | "stderr" = "stdout";
      if (current === "1") {
        current = "";
      } else if (current === "2") {
        fd = "stderr";
        current = "";
      } else if (current) {
        tokens.push(current);
        current = "";
      }

      if (trimmed[i + 1] === ">") {
        redirectAppend = true;
        i++;
      } else {
        redirectAppend = false;
      }

      redirectType = fd;
      continue;
    }

    // Handle & as a standalone token (only when unquoted)
    if (quoteMode === "none" && char === "&") {
      if (current) {
        if (redirectType) {
          redirects.push({ type: redirectType, file: current, append: redirectAppend });
          redirectType = null;
          redirectAppend = false;
        } else {
          tokens.push(current);
        }
        current = "";
      }
      tokens.push("&");
      continue;
    }

    if (quoteMode === "none" && /\s/.test(char)) {
      if (current) {
        if (redirectType) {
          redirects.push({ type: redirectType, file: current, append: redirectAppend });
          redirectType = null;
          redirectAppend = false;
        } else {
          tokens.push(current);
        }
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaped) {
    current += "\\";
  }

  if (current) {
    if (redirectType) {
      redirects.push({ type: redirectType, file: current, append: redirectAppend });
      redirectType = null;
      redirectAppend = false;
    } else {
      tokens.push(current);
    }
  }

  if (redirectType) {
    console.log("syntax error: expected file after >");
    return { command: "", args: [], redirects: [], background: false };
  }

  // Check for trailing & token to mark background execution
  let background = false;
  if (tokens.length > 0 && tokens[tokens.length - 1] === "&") {
    background = true;
    tokens.pop();
  }

  return {
    command: tokens[0] ?? "",
    args: tokens.slice(1),
    redirects,
    background,
  };
}