import AbstractDto from "../src/dto/AbstractDto";

class TestDto extends AbstractDto {
  foo!: string;
}

describe("AbstractDto", () => {
  it("assigns properties from init", () => {
    const dto = new TestDto({ foo: "bar" });
    expect(dto.foo).toBe("bar");
  });

  it("parse returns instance with properties", () => {
    const dto = TestDto.parse({ foo: "baz" });
    expect(dto).toBeInstanceOf(TestDto);
    expect(dto.foo).toBe("baz");
  });

  it("parse throws on non-object", () => {
    expect(() => TestDto.parse(null)).toThrow();
    expect(() => TestDto.parse(42)).toThrow();
  });
});
