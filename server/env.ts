/**
 * Reads a setting from the environment. Surrounding spaces and a matching pair of quotes are
 * removed, because values pasted into hosting dashboards often keep the quotes from a .env file.
 */
export function readEnv(name: string): string {
  let v = process.env[name] ?? "";
  v = v.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) v = v.slice(1, -1).trim();
  return v;
}
