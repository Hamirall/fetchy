import { HttpClient } from "../src/HttpClient";
import { RestDao } from "../src/dao/RestDao";
import AbstractDto from "../src/dto/AbstractDto";

class UserDto extends AbstractDto {
  id!: number;
  name!: string;
}

const json = (data: unknown, status = 200) =>
  new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("RestDao", () => {
  const fetchMock = jest.fn();
  global.fetch = fetchMock;
  const dao = new RestDao(new HttpClient("https://api.test.com"), "/users", UserDto);

  beforeEach(() => fetchMock.mockReset());

  it("lists DTOs, from a plain or wrapped array", async () => {
    fetchMock.mockResolvedValueOnce(json([{ id: 1, name: "A" }]));
    fetchMock.mockResolvedValueOnce(json({ "hydra:member": [{ id: 2, name: "B" }] }));
    const [a] = await dao.list({ page: 1 });
    const [b] = await dao.list();
    expect(a).toBeInstanceOf(UserDto);
    expect(b.name).toBe("B");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test.com/users?page=1");
  });

  it("maps CRUD calls to REST routes", async () => {
    fetchMock.mockImplementation(async () => json({ id: 7, name: "X" }));
    await dao.getOne(7);
    await dao.create({ name: "X" });
    await dao.update(7, { name: "Y" });
    await dao.patch(7, { name: "Z" });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(dao.delete(7)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      "GET https://api.test.com/users/7",
      "POST https://api.test.com/users",
      "PUT https://api.test.com/users/7",
      "PATCH https://api.test.com/users/7",
      "DELETE https://api.test.com/users/7",
    ]);
  });
});
