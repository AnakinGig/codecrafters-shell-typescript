const variables: Record<string, string> = {};

export function setVariable(name: string, value: string): void {
  variables[name] = value;
}

export function getVariable(name: string): string | undefined {
  if (name in variables) return variables[name];
  return process.env[name];
}

export function hasVariable(name: string): boolean {
  return name in variables;
}

export function getAllVariables(): Record<string, string> {
  return variables;
}