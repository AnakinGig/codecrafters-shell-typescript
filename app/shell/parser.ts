import { type ParsedCommand, type ParsedPipeline, type Redirect } from "./types";

// Splits the raw line into pipeline segments on unquoted "|"
function splitPipeline(line: string): string[] {
  const segments: string[] = [];
  let current = "";
  let quoteMode: "none" | "single" | "double" = "none";
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (quoteMode === "none" && escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (quoteMode === "none" && char === "\\") {
      escaped = true;
      current += char; // keep it, real parsing happens later per-segment
      continue;
    }

    if (char === "'" && quoteMode !== "double") {
      quoteMode = quoteMode === "single" ? "none" : "single";
      current += char;
      continue;
    }
    if (char === '"' && quoteMode !== "single") {
      quoteMode = quoteMode === "double" ? "none" : "double";
      current += char;
      continue;
    }

    if (quoteMode === "none" && char === "|") {
      segments.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  segments.push(current);
  return segments.map(s => s.trim());
}

// Parses a single pipeline stage (same logic you already had, minus the `&` handling)
function parseStage(segment: string): ParsedCommand {
  const tokens: string[] = [];
  const redirects: Redirect[] = [];
  let current = "";

  let quoteMode: "none" | "single" | "double" = "none";
  let escaped = false;
  let redirectType: "stdout" | "stderr" | null = null;
  let redirectAppend = false;

  const trimmed = segment.trim();

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

  if (escaped) current += "\\";

  if (current) {
    if (redirectType) {
      redirects.push({ type: redirectType, file: current, append: redirectAppend });
    } else {
      tokens.push(current);
    }
  }

  return {
    command: tokens[0] ?? "",
    args: tokens.slice(1),
    redirects,
  };
}

export function parseCommandLine(line: string): ParsedPipeline {
  let trimmed = line.trim();
  let background = false;

  // Detect trailing "&" on the whole pipeline
  if (trimmed.endsWith("&")) {
    background = true;
    trimmed = trimmed.slice(0, -1).trim();
  }

  const segments = splitPipeline(trimmed);
  const stages = segments.map(parseStage).filter(s => s.command !== "");

  return { stages, background };
}