/** Quote a value for C-Gate SET commands (required for spaces and empty names). */
export function formatCgateSetValue(value: string): string {
  const clean = value.replace(/[\r\n]/g, ' ').trim();
  if (clean === '') return '""';
  if (/[\s"]/.test(clean)) return `"${clean.replace(/"/g, '\\"')}"`;
  return clean;
}

/** Parse `GET <path> *` response lines into key/value parameters. */
export function parseObjectParams(lines: string[]): Record<string, string> {
  const params: Record<string, string> = {};
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const body = line.slice(colon + 1).trim();
    if (!body) continue;
    const re = /(\w+)=("(?:[^"\\]|\\.)*"|[^\s]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/\\"/g, '"');
      }
      params[m[1]] = val;
    }
  }
  return params;
}
