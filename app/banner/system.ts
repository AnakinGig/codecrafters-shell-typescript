import os from "os";
import si from "systeminformation";

export async function getSystemInfo() {
  const [cpu, graphics] = await Promise.all([
    si.cpu(),
    si.graphics(),
  ]);

  const interfaces = os.networkInterfaces();

  const ip =
    Object.values(interfaces)
      .flat()
      .find((i) => i?.family === "IPv4" && !i.internal)
      ?.address ?? "Unknown";


  const gpu =
    graphics.controllers.length > 0
      ? graphics.controllers[0].model
      : `${cpu.manufacturer} ${cpu.brand} (iGPU)`;


  let ram = "Unknown";

  try {
    const mem = await si.mem();

    const total = mem.total;
    const used = mem.total - mem.available;

    ram = `${(used / 1024 ** 3).toFixed(1)} / ${(total / 1024 ** 3).toFixed(1)} GB`;
  } catch {
    ram = "Unknown";
  }


  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: `${cpu.manufacturer} ${cpu.brand}`,
    gpu,
    ram,
    ip,
  };
}