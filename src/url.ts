/** A `/name/value` pair appended to the path, e.g. `{ name: "users", value: 42 }` → `users/42`. */
export interface PathResource {
  name: string;
  value?: string | number;
}

/**
 * Structured path, the format of the former axios wrapper:
 * `{ path: "teams", resources: [{ name: "players", value: 3 }] }` → `<base>teams/players/3`.
 */
export interface PathSpec {
  path: string;
  /** Replaces the client base URL for this call only. */
  prefix?: string;
  resources?: PathResource[];
}

export type Path = string | PathSpec;

type ParamValue = string | number | boolean | null | undefined | Date;
/** Query string values: `undefined`/`null` are skipped, arrays repeat the key (`?id=1&id=2`). */
export type QueryParams = Record<string, ParamValue | ParamValue[]>;

export function buildPath(base: string, path: Path): string {
  if (typeof path === "string") return joinUrl(base, path);
  if (typeof path?.path !== "string") throw new Error("Path is undefined");

  let url = joinUrl(path.prefix ?? base, path.path);
  if (!path.resources?.length) return url;

  for (const { name, value } of path.resources) {
    if (!name) throw new Error("Resources format is {name, value}");
    url = joinUrl(url, value === undefined || value === "" ? name : `${name}/${encodeURIComponent(value)}`);
  }
  return url;
}

export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      if (value === undefined || value === null) continue;
      search.append(key, value instanceof Date ? value.toISOString() : String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildUrl(base: string, path: Path, params?: QueryParams): string {
  const url = buildPath(base, path);
  const query = buildQuery(params);
  if (!query) return url;
  return url.includes("?") ? `${url}&${query.slice(1)}` : url + query;
}

/** Joins with exactly one slash; absolute URLs (`https://...`) ignore the base. */
function joinUrl(base: string, path: string): string {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(path) || !base) return path;
  if (!path) return base;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
