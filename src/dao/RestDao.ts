import { HttpClient, DtoConstructor, RequestOptions } from "../HttpClient";
import AbstractDto from "../dto/AbstractDto";
import type { Dao, Id } from "../interfaces/Dao";
import type { QueryParams } from "../url";

/**
 * Ready-made REST DAO: `GET /users`, `GET /users/:id`, `POST /users`, `PUT|PATCH|DELETE /users/:id`.
 * Extend it to add the resource's own calls.
 *
 * ```ts
 * class UserDao extends RestDao<UserDto> {
 *   constructor(http: HttpClient) { super(http, "/users", UserDto); }
 *   me() { return this.http.getDto("/users/me", UserDto); }
 * }
 * ```
 */
export class RestDao<T extends AbstractDto, TCreate = Partial<T>, TUpdate = Partial<T>>
  implements Dao<T, TCreate, TUpdate>
{
  constructor(
    protected http: HttpClient,
    protected resource: string,
    protected Dto: DtoConstructor<T>,
    protected options: RequestOptions = {},
  ) {}

  protected item(id: Id): string {
    return `${this.resource.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  }

  list(params?: QueryParams): Promise<T[]> {
    return this.http.listDto(this.resource, this.Dto, { ...this.options, params: { ...this.options.params, ...params } });
  }

  getOne(id: Id): Promise<T> {
    return this.http.getDto(this.item(id), this.Dto, this.options);
  }

  create(data: TCreate): Promise<T> {
    return this.http.postDto(this.resource, data, this.Dto, this.options);
  }

  update(id: Id, data: TUpdate): Promise<T> {
    return this.http.putDto(this.item(id), data, this.Dto, this.options);
  }

  patch(id: Id, data: Partial<TUpdate>): Promise<T> {
    return this.http.patchDto(this.item(id), data, this.Dto, this.options);
  }

  async delete(id: Id): Promise<void> {
    await this.http.delete(this.item(id), this.options);
  }
}
