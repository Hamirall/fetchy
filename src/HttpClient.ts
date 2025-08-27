import { HttpMethods } from "./enums/HttpMethods";
import { HttpType } from "./enums/HttpType";
import { httpErrorFromStatus } from "./errors/Errors";
import AbstractDto from "./dto/AbstractDto";

const METHODS_WITH_BODY = [
  HttpMethods.POST,
  HttpMethods.PUT,
  HttpMethods.PATCH,
] as const satisfies ReadonlyArray<HttpMethods>;

export type DtoConstructor<T extends AbstractDto> = {
  parse(raw: unknown): T;
};

export class HttpClient {
  private token: string | undefined;

  constructor(
    private baseUrl: string,
    token: string|undefined,
  ) {
    this.token = token;
  }

  async request<T>(
    method: HttpMethods,
    url: string,
    body?: unknown,
  ): Promise<T> {
    try {
      const init: RequestInit = { method };
      init.headers = {};

      const token = this.token;
      if (token) {
        (init.headers as Record<string, string>)["Authorization"] =
          `Bearer ${token}`;
      }

      if (METHODS_WITH_BODY.find((m) => m === method)) {
        if (body !== undefined && body !== null) {
          if (
            typeof body === "string" ||
            body instanceof FormData ||
            body instanceof Blob
          ) {
            init.body = body as BodyInit;
          } else {
            init.body = JSON.stringify(body);
            init.headers = { "Content-Type": HttpType.JSON };
          }
        }
      }

      const response = await fetch(`${this.baseUrl}${url}`, init);
      return this._parseResponse<T>(response);
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && "message" in error) {
        throw httpErrorFromStatus(
          (error as { status: number }).status,
          (error as { message: string }).message
        );
      }
      throw error;
    }
  }

  async requestDto<T extends AbstractDto>(
    method: HttpMethods,
    url: string,
    body: unknown,
    DtoClass: DtoConstructor<T>,
  ): Promise<T> {
    const response = await this.request<unknown>(method, url, body);
    return DtoClass.parse(response);
  }

  async getDto<T extends AbstractDto>(
    url: string,
    DtoClass: DtoConstructor<T>,
  ): Promise<T> {
    const raw = await this._get(url);
    return DtoClass.parse(raw);
  }

  async postDto<T extends AbstractDto>(
    url: string,
    body: unknown,
    DtoClass: DtoConstructor<T>,
  ): Promise<T> {
    const raw = await this._post(url, body);
    return DtoClass.parse(raw);
  }

  async putDto<T extends AbstractDto>(
    url: string,
    body: unknown,
    DtoClass: DtoConstructor<T>,
  ): Promise<T> {
    const raw = await this._put(url, body);
    return DtoClass.parse(raw);
  }

  async patchDto<T extends AbstractDto>(
    url: string,
    body: unknown,
    DtoClass: DtoConstructor<T>,
  ): Promise<T> {
    const raw = await this._patch(url, body);
    return DtoClass.parse(raw);
  }

  async deleteDto<T extends AbstractDto>(
    url: string,
    DtoClass: DtoConstructor<T>,
  ): Promise<T> {
    const raw = await this._delete(url);
    return DtoClass.parse(raw);
  }

  private _get<T>(url: string): Promise<T> {
    return this.request(HttpMethods.GET, url);
  }

  private _post<T>(url: string, body: unknown): Promise<T> {
    return this.request(HttpMethods.POST, url, body);
  }

  private _put<T>(url: string, body: unknown): Promise<T> {
    return this.request(HttpMethods.PUT, url, body);
  }

  private _patch<T>(url: string, body: unknown): Promise<T> {
    return this.request(HttpMethods.PATCH, url, body);
  }

  private _delete<T>(url: string): Promise<T> {
    return this.request(HttpMethods.DELETE, url);
  }

  private _parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}
