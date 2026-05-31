import type { CgateProjectInfo } from '../shared/cgateStatus';

/** Extract the version token from a C-Gate connect greeting line. */
export function parseServerVersion(greeting: string | null | undefined): string | null {
  if (!greeting) return null;
  const m = greeting.match(/Version:\s*(.+?)(?:\s+#|$)/i);
  return m?.[1]?.trim() ?? null;
}

/** Parse `project=` / optional `state=` lines from PROJECT LIST or PROJECT DIR. */
export function parseProjectLines(lines: string[]): CgateProjectInfo[] {
  const out: CgateProjectInfo[] = [];
  for (const line of lines) {
    const nameM = line.match(/project=(\S+)/i);
    if (!nameM) continue;
    const stateM = line.match(/state=(\S+)/i);
    out.push({ name: nameM[1], state: stateM?.[1] ?? null });
  }
  return out;
}

/** Pick the project CBus Studio is using from list output + cached name. */
export function resolveActiveProject(
  loaded: CgateProjectInfo[],
  projectName: string | null,
): CgateProjectInfo | null {
  if (projectName) {
    const match = loaded.find((p) => p.name.toLowerCase() === projectName.toLowerCase());
    if (match) return match;
    return { name: projectName, state: null };
  }
  return loaded.find((p) => p.state?.toLowerCase() === 'started') ?? loaded[0] ?? null;
}

/** True for the initial service-ready greeting C-Gate sends on connect. */
export function isServiceReadyLine(line: string): boolean {
  return /^201\s/i.test(line) || /service ready/i.test(line);
}
