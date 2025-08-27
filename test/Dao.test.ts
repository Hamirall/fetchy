import type { Dto } from "../src/interfaces/Dao";

const dummyDao: Dto = {
  list: async <T>(url: string) => [{ url } as T],
  getOne: async <T>(url: string) => ({ url } as T),
  create: async <T>(url: string, data: T) => data,
  update: async <T>(url: string, data: T) => data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete: async (url: string) => {},
};

describe("Dto interface", () => {
  it("list returns array", async () => {
    const res = await dummyDao.list<{ url: string }>("/foo");
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].url).toBe("/foo");
  });

  it("getOne returns object", async () => {
    const res = await dummyDao.getOne<{ url: string }>("/bar");
    expect(res.url).toBe("/bar");
  });

  it("create returns data", async () => {
    const data = { foo: "bar" };
    const res = await dummyDao.create("/baz", data);
    expect(res).toBe(data);
  });

  it("update returns data", async () => {
    const data = { foo: "baz" };
    const res = await dummyDao.update("/baz", data);
    expect(res).toBe(data);
  });

  it("delete resolves", async () => {
    await expect(dummyDao.delete("/baz")).resolves.toBeUndefined();
  });
});
