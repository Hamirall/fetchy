import { HttpClient } from "../src/HttpClient";
import { HttpMethods } from "../src/enums/HttpMethods";
import { HttpType } from "../src/enums/HttpType";
import AbstractDto from "../src/dto/AbstractDto";

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
    await expect(client.request(HttpMethods.GET, "/fail")).rejects.toThrow(
      /HTTP error! status: 404/,
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
