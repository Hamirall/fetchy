export default abstract class AbstractDto {
  constructor(init?: Record<string, unknown>) {
    if (init) Object.assign(this, init);
  }

  static parse<T extends AbstractDto>(
    this: new (props: Record<string, unknown>) => T,
    raw: unknown,
  ): T {
    if (raw == null || typeof raw !== "object") {
      throw new Error("DTO parse: expected object");
    }
    return new this(raw as Record<string, unknown>);
  }
}
