import { HttpCode } from "../enums/HttpCode";

class HttpError extends Error {
  constructor(
    public status: number,
    message?: string,
  ) {
    super(message ?? `HTTP error! status: ${status}`);
    this.name = "HttpError";
  }
}

class UnhandledHttpError extends HttpError {
  constructor(status: number, message?: string) {
    super(status, message ?? `Unhandled HTTP error! status: ${status}`);
    this.name = "UnhandledHttpError";
  }
}

class UnauthorizedError extends HttpError {
  constructor() {
    super(HttpCode.UNAUTHORIZED, "Unauthorized");
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends HttpError {
  constructor() {
    super(HttpCode.FORBIDDEN, "Forbidden");
    this.name = "ForbiddenError";
  }
}

class NotFoundError extends HttpError {
  constructor() {
    super(HttpCode.NOT_FOUND, "Not found");
    this.name = "NotFoundError";
  }
}

class BadRequestError extends HttpError {
  constructor() {
    super(HttpCode.BAD_REQUEST, "Bad Request");
    this.name = "BadRequestError";
  }
}

class ServerError extends HttpError {
  constructor() {
    super(HttpCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
    this.name = "ServerError";
  }
}

export function httpErrorFromStatus(
  status: number,
  message?: string,
): HttpError {
  switch (status) {
    case HttpCode.UNAUTHORIZED:
      return new UnauthorizedError();
    case HttpCode.FORBIDDEN:
      return new ForbiddenError();
    case HttpCode.NOT_FOUND:
      return new NotFoundError();
    case HttpCode.BAD_REQUEST:
      return new BadRequestError();
    case HttpCode.INTERNAL_SERVER_ERROR:
      return new ServerError();
    default:
      return new UnhandledHttpError(status, message);
  }
}
