import { getSystemInfo } from "./system";

export async function buildBanner() {
  const info = await getSystemInfo();

  const lines = [
    " Welcome to TypeShell",
    ` OS  : ${info.os} `,
    ` CPU : ${info.cpu} `,
    ` GPU : ${info.gpu} `,
    ` RAM : ${info.ram} `,
    ` IP  : ${info.ip} `,
  ];

  const width = Math.max(...lines.map((l) => l.length));

  const top = `╔${"═".repeat(width + 2)}╗`;
  const mid = `╠${"═".repeat(width + 2)}╣`;
  const bot = `╚${"═".repeat(width + 2)}╝`;

  return [
    top,
    `║ ${lines[0].padEnd(width)} ║`,
    mid,
    ...lines.slice(1).map((l) => `║ ${l.padEnd(width)} ║`),
    bot,
  ].join("\n");
}