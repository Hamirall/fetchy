import type { QueryParams } from "../url";

export type Id = string | number;

/** CRUD access to one resource, typed with its DTO. */
export interface Dao<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  list(params?: QueryParams): Promise<T[]>;
  getOne(id: Id): Promise<T>;
  create(data: TCreate): Promise<T>;
  update(id: Id, data: TUpdate): Promise<T>;
  patch(id: Id, data: Partial<TUpdate>): Promise<T>;
  delete(id: Id): Promise<void>;
}
