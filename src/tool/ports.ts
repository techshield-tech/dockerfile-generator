// Pure helpers for the free-text "exposed ports" field.

export function parsePorts(text: string): number[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => Number.parseInt(part, 10))
    .filter((port) => Number.isFinite(port) && port > 0 && port <= 65535);
}

export function formatPorts(ports: number[]): string {
  return ports.join(', ');
}
