import { HttpCode } from "../enums/HttpCode";

/** What we know about the failed request, attached to every error for logging and display. */
export interface HttpErrorDetails {
  message?: string;
  url?: string;
  method?: string;
  /** Parsed response body (JSON when possible, text otherwise). */
  body?: unknown;
}

export class HttpError extends Error {
  url?: string;
  method?: string;
  body?: unknown;

  constructor(
    public status: number,
    details: string | HttpErrorDetails = {},
  ) {
    const d = typeof details === "string" ? { message: details } : details;
    super(d.message ?? `HTTP error! status: ${status}`);
    this.name = "HttpError";
    this.url = d.url;
    this.method = d.method;
    this.body = d.body;
  }
}

export class UnhandledHttpError extends HttpError {
  constructor(status: number, details: string | HttpErrorDetails = {}) {
    const d = typeof details === "string" ? { message: details } : details;
    super(status, { ...d, message: d.message ?? `Unhandled HTTP error! status: ${status}` });
    this.name = "UnhandledHttpError";
  }
}

export class BadRequestError extends HttpError {
  constructor(details: HttpErrorDetails = {}) {
    super(HttpCode.BAD_REQUEST, { message: "Bad Request", ...details });
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(details: HttpErrorDetails = {}) {
    super(HttpCode.UNAUTHORIZED, { message: "Unauthorized", ...details });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(details: HttpErrorDetails = {}) {
    super(HttpCode.FORBIDDEN, { message: "Forbidden", ...details });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(details: HttpErrorDetails = {}) {
    super(HttpCode.NOT_FOUND, { message: "Not found", ...details });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends HttpError {
  constructor(details: HttpErrorDetails = {}) {
    super(HttpCode.CONFLICT, { message: "Conflict", ...details });
    this.name = "ConflictError";
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(details: HttpErrorDetails = {}) {
    super(HttpCode.UNPROCESSABLE_ENTITY, { message: "Unprocessable Entity", ...details });
    this.name = "UnprocessableEntityError";
  }
}

/** Any 5xx: `status` keeps the exact code (500, 502, 503...). */
export class ServerError extends HttpError {
  constructor(status: number = HttpCode.INTERNAL_SERVER_ERROR, details: HttpErrorDetails = {}) {
    super(status, { message: "Internal Server Error", ...details });
    this.name = "ServerError";
  }
}

/** The request never got a response: offline, DNS, CORS, connection reset... */
export class NetworkError extends Error {
  constructor(
    public url: string,
    public method: string,
    public cause?: unknown,
  ) {
    super(`Network error on ${method} ${url}`);
    this.name = "NetworkError";
  }
}

/** The request took longer than the configured `timeout`. */
export class TimeoutError extends Error {
  constructor(
    public url: string,
    public method: string,
    public timeout: number,
  ) {
    super(`Request timed out after ${timeout}ms on ${method} ${url}`);
    this.name = "TimeoutError";
  }
}

export function httpErrorFromStatus(
  status: number,
  details: string | HttpErrorDetails = {},
): HttpError {
  const d = typeof details === "string" ? { message: details } : details;
  switch (status) {
    case HttpCode.BAD_REQUEST:
      return new BadRequestError(d);
    case HttpCode.UNAUTHORIZED:
      return new UnauthorizedError(d);
    case HttpCode.FORBIDDEN:
      return new ForbiddenError(d);
    case HttpCode.NOT_FOUND:
      return new NotFoundError(d);
    case HttpCode.CONFLICT:
      return new ConflictError(d);
    case HttpCode.UNPROCESSABLE_ENTITY:
      return new UnprocessableEntityError(d);
    default:
      return status >= 500 ? new ServerError(status, d) : new UnhandledHttpError(status, d);
  }
}
