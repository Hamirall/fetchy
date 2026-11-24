import { HttpClient } from "../src/HttpClient";
import { HttpMethods } from "../src/enums/HttpMethods";
import { HttpType } from "../src/enums/HttpType";
import AbstractDto from "../src/dto/AbstractDto";
import { NetworkError, NotFoundError, TimeoutError, UnprocessableEntityError } from "../src/errors/Errors";

global.fetch = jest.fn();

class DummyDto extends AbstractDto {
  foo!: string;
  static override parse<T extends AbstractDto>(
    this: new (props: Record<string, unknown>) => T,
    raw: unknown,
  ): T {
    return new this(raw as Record<string, unknown>);
  }
}

describe("HttpClient", () => {
  const baseUrl = "https://api.test.com";
  const token = "iamatoken";
  let client: HttpClient;

  beforeEach(() => {
    (fetch as jest.Mock).mockReset();
    client = new HttpClient(baseUrl, token);
  });

  it("should inject Authorization header if token is provided", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ foo: "bar" }),
    });
    await client.request(HttpMethods.GET, "/test");
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/test`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      }),
    );
  });

  it("should send JSON body and Content-Type for POST", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ foo: "bar" }),
    });
    await client.request(HttpMethods.POST, "/test", { foo: "bar" });
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/test`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ foo: "bar" }),
        headers: expect.objectContaining({
          "Content-Type": HttpType.JSON,
        }),
      }),
    );
  });

  it("should parse response as DTO", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ foo: "bar" }),
    });
    const dto = await client.getDto<DummyDto>("/test", DummyDto);
    expect(dto).toBeInstanceOf(DummyDto);
    expect(dto.foo).toBe("bar");
  });

  it("should throw error on non-ok response", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    await expect(client.request(HttpMethods.GET, "/fail")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("should support deleteDto", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ foo: "deleted" }),
    });
    const dto = await client.deleteDto<DummyDto>("/test", DummyDto);
    expect(dto.foo).toBe("deleted");
  });
});

describe("HttpClient (real Response)", () => {
  const fetchMock = global.fetch as jest.Mock;
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/ld+json" } });

  beforeEach(() => fetchMock.mockReset());

  it("reads the token from a function on every request and keeps it with a JSON body", async () => {
    let token = "a";
    const client = new HttpClient("https://api.test.com", { token: () => token, headers: { "X-App": "1" } });
    fetchMock.mockImplementation(async () => json({}));
    await client.post("/x", { foo: 1 });
    token = "b";
    await client.get("/x");
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      Authorization: "Bearer a",
      "Content-Type": "application/json",
      "X-App": "1",
    });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer b");
  });

  it("returns data, status and headers with send()", async () => {
    fetchMock.mockResolvedValue(json({ ok: 1 }, 201));
    const res = await new HttpClient("https://api.test.com").send(HttpMethods.POST, "/x", {});
    expect(res.status).toBe(201);
    expect(res.data).toEqual({ ok: 1 });
    expect(res.headers.get("Content-Type")).toBe("application/ld+json");
  });

  it("handles empty and text bodies", async () => {
    const client = new HttpClient("https://api.test.com");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockResolvedValueOnce(new Response("pong", { headers: { "Content-Type": "text/plain" } }));
    await expect(client.delete("/x")).resolves.toBeUndefined();
    await expect(client.get("/ping")).resolves.toBe("pong");
  });

  it("throws typed errors with the API message and calls onError", async () => {
    const onError = jest.fn();
    const client = new HttpClient("https://api.test.com", { onError });
    fetchMock.mockResolvedValue(json({ "hydra:description": "name: too short" }, 422));
    const err = (await client.post("/x", {}).catch((e) => e)) as UnprocessableEntityError;
    expect(err).toBeInstanceOf(UnprocessableEntityError);
    expect(err.message).toBe("name: too short");
    expect(err.body).toEqual({ "hydra:description": "name: too short" });
    expect(onError).toHaveBeenCalledWith(err, expect.objectContaining({ method: "POST", url: "https://api.test.com/x" }));
  });

  it("wraps network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(new HttpClient("https://api.test.com").get("/x")).rejects.toBeInstanceOf(NetworkError);
  });

  it("times out", async () => {
    fetchMock.mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_, reject) => {
          if (init.signal?.aborted) reject(init.signal.reason);
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    await expect(new HttpClient("https://api.test.com", { timeout: 20 }).get("/slow")).rejects.toBeInstanceOf(
      TimeoutError,
    );
  });

  it("rethrows a caller abort untouched", async () => {
    fetchMock.mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_, reject) => {
          if (init.signal?.aborted) reject(init.signal.reason);
          init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const controller = new AbortController();
    const p = new HttpClient("https://api.test.com", { timeout: 1000 }).get("/x", { signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("uploads a plain object as multipart without forcing Content-Type", async () => {
    fetchMock.mockResolvedValue(json({}));
    await new HttpClient("https://api.test.com").upload("/files", { file: new Blob(["x"]), label: "doc", skip: null });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    expect([...init.body.keys()]).toEqual(["file", "label"]);
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("supports the structured path and query params", async () => {
    fetchMock.mockResolvedValue(json([]));
    await new HttpClient("https://api.test.com/api").get(
      { path: "teams", resources: [{ name: "matches", value: 4 }] },
      { params: { page: 2 } },
    );
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test.com/api/teams/matches/4?page=2");
  });
});
