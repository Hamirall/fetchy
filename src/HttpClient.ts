import { HttpMethods } from "./enums/HttpMethods";
import { HttpType } from "./enums/HttpType";
import { HttpError, NetworkError, TimeoutError, httpErrorFromStatus } from "./errors/Errors";
import AbstractDto from "./dto/AbstractDto";
import { Path, QueryParams, buildUrl } from "./url";

const METHODS_WITH_BODY = [
  HttpMethods.POST,
  HttpMethods.PUT,
  HttpMethods.PATCH,
  HttpMethods.DELETE,
] as const satisfies ReadonlyArray<HttpMethods>;

/** A DTO class (`UserDto`, inferred from its constructor) or any object with a `parse(raw)` returning T. */
export type DtoConstructor<T extends AbstractDto> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { new (...args: any[]): T; parse(raw: unknown): unknown }
  | { parse(raw: unknown): NoInfer<T> };

function parseDto<T extends AbstractDto>(Dto: DtoConstructor<T>, raw: unknown): T {
  return Dto.parse(raw) as T;
}

type Awaitable<T> = T | Promise<T>;
export type TokenProvider = string | null | undefined | (() => Awaitable<string | null | undefined>);
export type ResponseType = "json" | "text" | "blob" | "arrayBuffer";

export interface RequestContext {
  method: HttpMethods;
  url: string;
  init: RequestInit;
}

export interface ClientOptions {
  /** Bearer token, or a function read on every request (e.g. `() => localStorage.getItem("token")`). */
  token?: TokenProvider;
  /** Headers sent on every request; a function is read on every request. */
  headers?: Record<string, string> | (() => Awaitable<Record<string, string>>);
  /** Default timeout in ms (none by default). */
  timeout?: number;
  /** Logs every failed request to the console with its URL, params and response. */
  debug?: boolean;
  /** Last chance to tweak the request (headers, credentials...) before it is sent. */
  onRequest?: (ctx: RequestContext) => Awaitable<void>;
  /** Called for every error (HTTP, network, timeout) before it is thrown: global toast, logout on 401... */
  onError?: (error: Error, ctx: RequestContext) => Awaitable<void>;
  /** Forwarded to fetch (`"include"` to send cookies cross-origin). */
  credentials?: RequestCredentials;
}

export interface RequestOptions {
  params?: QueryParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  /** How to read the response body; by default JSON when the server says so, text otherwise. */
  responseType?: ResponseType;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

export class HttpClient {
  private options: ClientOptions;

  /** `new HttpClient(baseUrl, token)` still works; pass an options object for the rest. */
  constructor(
    private baseUrl: string,
    options: TokenProvider | ClientOptions = {},
  ) {
    this.options = isOptions(options) ? options : { token: options };
  }

  setToken(token: TokenProvider): void {
    this.options.token = token;
  }

  /** Sends the request and returns the body with the status and headers. */
  async send<T>(
    method: HttpMethods,
    path: Path,
    body?: unknown,
    opts: RequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const url = buildUrl(this.baseUrl, path, opts.params);
    const headers: Record<string, string> = { ...(await resolve(this.options.headers)) };
    const token = await resolve(this.options.token);
    if (token) headers.Authorization = `Bearer ${token}`;

    const init: RequestInit = { method, headers };
    if (this.options.credentials) init.credentials = this.options.credentials;
    if (METHODS_WITH_BODY.some((m) => m === method) && body !== undefined && body !== null) {
      if (isRawBody(body)) {
        // FormData: let fetch set the multipart boundary itself.
        init.body = body;
      } else {
        init.body = JSON.stringify(body);
        headers["Content-Type"] = HttpType.JSON;
      }
    }
    Object.assign(headers, opts.headers);

    const timeout = opts.timeout ?? this.options.timeout;
    const signals = [opts.signal, timeout ? AbortSignal.timeout(timeout) : undefined].filter(
      (s): s is AbortSignal => Boolean(s),
    );
    if (signals.length) init.signal = signals.length === 1 ? signals[0] : anySignal(signals);

    const ctx: RequestContext = { method, url, init };
    await this.options.onRequest?.(ctx);

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      // A caller-side abort is not a failure: rethrow the AbortError untouched.
      if (opts.signal?.aborted) throw error;
      // Checked by name: the DOMException may come from another realm (iframe, test VM).
      const isTimeout = (error as { name?: string } | null)?.name === "TimeoutError";
      throw await this.fail(
        isTimeout ? new TimeoutError(url, method, timeout ?? 0) : new NetworkError(url, method, error),
        ctx,
      );
    }

    const data = await readBody(response, opts.responseType);
    if (!response.ok) {
      throw await this.fail(
        httpErrorFromStatus(response.status, { url, method, body: data, message: errorMessage(data) }),
        ctx,
      );
    }
    return { data: data as T, status: response.status, headers: response.headers };
  }

  /** Sends the request and returns the body only. */
  async request<T>(method: HttpMethods, path: Path, body?: unknown, opts?: RequestOptions): Promise<T> {
    return (await this.send<T>(method, path, body, opts)).data;
  }

  get<T>(path: Path, opts?: RequestOptions): Promise<T> {
    return this.request(HttpMethods.GET, path, undefined, opts);
  }

  post<T>(path: Path, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request(HttpMethods.POST, path, body, opts);
  }

  put<T>(path: Path, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request(HttpMethods.PUT, path, body, opts);
  }

  patch<T>(path: Path, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request(HttpMethods.PATCH, path, body, opts);
  }

  delete<T = void>(path: Path, opts?: RequestOptions & { body?: unknown }): Promise<T> {
    return this.request(HttpMethods.DELETE, path, opts?.body, opts);
  }

  /** Multipart upload: pass a FormData, or a plain object whose values are files, blobs or strings. */
  upload<T>(path: Path, data: FormData | Record<string, unknown>, opts?: RequestOptions): Promise<T> {
    return this.request(HttpMethods.POST, path, toFormData(data), opts);
  }

  async requestDto<T extends AbstractDto>(
    method: HttpMethods,
    path: Path,
    body: unknown,
    DtoClass: DtoConstructor<T>,
    opts?: RequestOptions,
  ): Promise<T> {
    return parseDto(DtoClass, await this.request<unknown>(method, path, body, opts));
  }

  getDto<T extends AbstractDto>(path: Path, DtoClass: DtoConstructor<T>, opts?: RequestOptions): Promise<T> {
    return this.requestDto(HttpMethods.GET, path, undefined, DtoClass, opts);
  }

  /** GET a collection: accepts a plain array or a wrapped one (`items`, `data`, `member`, `hydra:member`). */
  async listDto<T extends AbstractDto>(path: Path, DtoClass: DtoConstructor<T>, opts?: RequestOptions): Promise<T[]> {
    const raw = await this.get<unknown>(path, opts);
    return unwrapList(raw).map((item) => parseDto(DtoClass, item));
  }

  postDto<T extends AbstractDto>(path: Path, body: unknown, DtoClass: DtoConstructor<T>, opts?: RequestOptions): Promise<T> {
    return this.requestDto(HttpMethods.POST, path, body, DtoClass, opts);
  }

  putDto<T extends AbstractDto>(path: Path, body: unknown, DtoClass: DtoConstructor<T>, opts?: RequestOptions): Promise<T> {
    return this.requestDto(HttpMethods.PUT, path, body, DtoClass, opts);
  }

  patchDto<T extends AbstractDto>(path: Path, body: unknown, DtoClass: DtoConstructor<T>, opts?: RequestOptions): Promise<T> {
    return this.requestDto(HttpMethods.PATCH, path, body, DtoClass, opts);
  }

  deleteDto<T extends AbstractDto>(path: Path, DtoClass: DtoConstructor<T>, opts?: RequestOptions): Promise<T> {
    return this.requestDto(HttpMethods.DELETE, path, undefined, DtoClass, opts);
  }

  private async fail(error: Error, ctx: RequestContext): Promise<Error> {
    if (this.options.debug) logError(error, ctx);
    await this.options.onError?.(error, ctx);
    return error;
  }
}

function isOptions(value: TokenProvider | ClientOptions): value is ClientOptions {
  return typeof value === "object" && value !== null;
}

async function resolve<T>(value: T | (() => Awaitable<T>)): Promise<T> {
  return typeof value === "function" ? (value as () => Awaitable<T>)() : value;
}

function isRawBody(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

function toFormData(data: FormData | Record<string, unknown>): FormData {
  if (data instanceof FormData) return data;
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null) continue;
      if (item instanceof Blob) form.append(key, item);
      else form.append(key, typeof item === "object" ? JSON.stringify(item) : String(item));
    }
  }
  return form;
}

async function readBody(response: Response, type?: ResponseType): Promise<unknown> {
  if (response.status === 204 || response.status === 205 || response.status === 304) return undefined;
  if (type && type !== "json") return response[type]();
  // Mocks or old polyfills may not expose headers/text: fall back to json().
  if (!response.headers || typeof response.text !== "function") return response.json();

  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get("Content-Type") ?? "";
  if (type === "json" || /[/+]json\b/i.test(contentType)) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    for (const key of ["items", "data", "member", "hydra:member"]) {
      const value = (raw as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value;
    }
  }
  throw new Error("DTO list: expected an array");
}

/** Pulls a readable message out of the usual API error shapes. */
function errorMessage(body: unknown): string | undefined {
  if (typeof body === "string") return body.length <= 200 && body.trim() ? body.trim() : undefined;
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  for (const key of ["message", "detail", "hydra:description", "error_description", "error", "title"]) {
    if (typeof b[key] === "string" && b[key]) return b[key] as string;
  }
  return undefined;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any(signals);
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) return AbortSignal.abort(s.reason);
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

function logError(error: Error, { method, url, init }: RequestContext): void {
  console.groupCollapsed?.(`[fecthy] ${method} ${url} → ${error.name}`);
  console.error(error.message);
  if (error instanceof HttpError) console.error("Response:", error.status, error.body);
  if (init.body) console.error("Body:", init.body);
  console.groupEnd?.();
}
