export interface Dto {
  list: <T>(url: string) => Promise<T[]>;
  getOne: <T>(url: string) => Promise<T>;
  create: <T>(url: string, data: T) => Promise<T>;
  update: <T>(url: string, data: T) => Promise<T>;
  delete: (url: string) => Promise<void>;
}
