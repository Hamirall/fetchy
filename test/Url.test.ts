import { buildPath, buildQuery, buildUrl } from "../src/url";

describe("url", () => {
  const base = "https://api.test.com/api/";

  it("joins base and path with a single slash", () => {
    expect(buildPath(base, "/users")).toBe("https://api.test.com/api/users");
    expect(buildPath("https://api.test.com", "users")).toBe("https://api.test.com/users");
  });

  it("keeps absolute URLs untouched", () => {
    expect(buildPath(base, "https://cdn.test.com/x")).toBe("https://cdn.test.com/x");
  });

  it("builds resource segments like the axios wrapper", () => {
    expect(
      buildPath(base, { path: "teams", resources: [{ name: "players", value: 3 }, { name: "stats" }] }),
    ).toBe("https://api.test.com/api/teams/players/3/stats");
  });

  it("uses prefix for one call without changing the base", () => {
    expect(buildPath(base, { path: "health", prefix: "https://other.test" })).toBe("https://other.test/health");
    expect(buildPath(base, { path: "health" })).toBe("https://api.test.com/api/health");
  });

  it("throws on malformed specs", () => {
    expect(() => buildPath(base, {} as never)).toThrow(/Path is undefined/);
    expect(() => buildPath(base, { path: "x", resources: [{ name: "" }] })).toThrow(/Resources format/);
  });

  it("encodes query params, skips empty values and repeats arrays", () => {
    expect(buildQuery({ q: "a b", page: 2, skip: undefined, none: null, id: [1, 2], on: false })).toBe(
      "?q=a+b&page=2&id=1&id=2&on=false",
    );
    expect(buildQuery({})).toBe("");
    expect(buildUrl(base, "users?sort=name", { page: 1 })).toBe("https://api.test.com/api/users?sort=name&page=1");
  });
});
