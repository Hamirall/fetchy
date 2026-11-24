import {
  httpErrorFromStatus,
} from "../src/errors/Errors";
import { HttpCode } from "../src/enums/HttpCode";

describe("httpErrorFromStatus", () => {
  it("returns UnauthorizedError for 401", () => {
    const err = httpErrorFromStatus(HttpCode.UNAUTHORIZED);
    expect(err.name).toBe("UnauthorizedError");
    expect(err.status).toBe(401);
  });

  it("returns ForbiddenError for 403", () => {
    const err = httpErrorFromStatus(HttpCode.FORBIDDEN);
    expect(err.name).toBe("ForbiddenError");
    expect(err.status).toBe(403);
  });

  it("returns NotFoundError for 404", () => {
    const err = httpErrorFromStatus(HttpCode.NOT_FOUND);
    expect(err.name).toBe("NotFoundError");
    expect(err.status).toBe(404);
  });

  it("returns BadRequestError for 400", () => {
    const err = httpErrorFromStatus(HttpCode.BAD_REQUEST);
    expect(err.name).toBe("BadRequestError");
    expect(err.status).toBe(400);
  });

  it("returns ServerError for 500", () => {
    const err = httpErrorFromStatus(HttpCode.INTERNAL_SERVER_ERROR);
    expect(err.name).toBe("ServerError");
    expect(err.status).toBe(500);
  });

  it("returns UnhandledHttpError for unknown code", () => {
    const err = httpErrorFromStatus(418, "I'm a teapot");
    expect(err.name).toBe("UnhandledHttpError");
    expect(err.status).toBe(418);
    expect(err.message).toMatch(/teapot/);
  });
});

describe("httpErrorFromStatus details", () => {
  it("maps 409, 422 and every 5xx", () => {
    expect(httpErrorFromStatus(409).name).toBe("ConflictError");
    expect(httpErrorFromStatus(422).name).toBe("UnprocessableEntityError");
    const err = httpErrorFromStatus(503);
    expect(err.name).toBe("ServerError");
    expect(err.status).toBe(503);
  });

  it("keeps url, method, body and message", () => {
    const err = httpErrorFromStatus(404, { url: "/x", method: "GET", body: { a: 1 }, message: "Nope" });
    expect(err).toMatchObject({ url: "/x", method: "GET", body: { a: 1 }, message: "Nope" });
  });
});
