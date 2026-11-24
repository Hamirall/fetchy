<p align="center">
  <img src="assets/logo.png" alt="fecthy logo" width="200" />
</p>

**fecthy** is a lightweight TypeScript toolkit to structure your HTTP calls on the frontend: a `fetch` client with no dependency, typed DTOs and DAOs, typed errors and centralized hooks.

---

## Main Features

- **HttpClient** on native `fetch`, no dependency: `get / post / put / patch / delete / upload`, query params, timeouts, abort signals.
- **DTOs**: `getDto`, `listDto`, `postDto`... return instances of your DTO classes, with the type inferred from the class.
- **RestDao**: ready-made CRUD (`list`, `getOne`, `create`, `update`, `patch`, `delete`) for a REST resource, to extend with your own calls.
- **Typed errors**: `NotFoundError`, `UnauthorizedError`, `UnprocessableEntityError`, `ServerError`, `NetworkError`, `TimeoutError`... carrying the status, URL, method and response body.
- **Hooks**: dynamic token and headers, `onRequest`, `onError` (global toast, logout on 401), `debug` logging.
- **URL builder**: plain strings or structured paths (`{ path, resources, prefix }`).

---

## Installation

```bash
npm install fecthy
# or
yarn add fecthy
```

---

## Quick Example

```typescript
import { AbstractDto, HttpClient, HttpMethods, NotFoundError, RestDao, UnauthorizedError } from "fecthy";

class UserDto extends AbstractDto {
  id!: number;
  name!: string;
}

const http = new HttpClient("https://api.example.com/api", {
  token: () => localStorage.getItem("token"), // read on every request
  timeout: 10_000,
  onError: (err) => {
    if (err instanceof UnauthorizedError) location.assign("/login");
  },
});

// Typed calls: `user` is a UserDto
const user = await http.getDto("/users/42", UserDto);
const users = await http.listDto("/users", UserDto, { params: { page: 2, role: ["admin", "dev"] } });

// Plain calls
const stats = await http.get<{ wins: number }>("/stats");
await http.patch("/users/42", { name: "Neo" });
await http.delete("/users/42");
await http.upload("/avatars", { file: input.files[0], label: "me" });

// Status and headers when needed
const { data, status, headers } = await http.send(HttpMethods.POST, "/users", { name: "Trinity" });

// Fine-grained error handling
try {
  await http.getDto("/users/42", UserDto);
} catch (err) {
  if (err instanceof NotFoundError) {
    // err.body holds the parsed response, err.message the API message when there is one
  }
}
```

### DAO

```typescript
class UserDao extends RestDao<UserDto> {
  constructor(http: HttpClient) {
    super(http, "/users", UserDto);
  }

  me() {
    return this.http.getDto("/users/me", UserDto);
  }
}

const users = new UserDao(http);
await users.list({ page: 1 }); // GET /users?page=1 (plain array, `items`, `data`, `member` or `hydra:member`)
await users.getOne(42); // GET /users/42
await users.create({ name: "Morpheus" }); // POST /users
await users.patch(42, { name: "Neo" }); // PATCH /users/42
await users.delete(42); // DELETE /users/42
```

### Client options

| Option        | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `token`       | Bearer token: a string or a (async) function read on every request          |
| `headers`     | Headers for every request: an object or a (async) function                  |
| `timeout`     | Default timeout in ms, throws `TimeoutError`                                |
| `credentials` | Forwarded to `fetch` (`"include"` for cookies cross-origin)                 |
| `onRequest`   | `(ctx) => void`: last tweak of `ctx.init` before sending                    |
| `onError`     | `(error, ctx) => void`: called for every error before it is thrown          |
| `debug`       | Logs failed requests (URL, status, response, body) to the console           |

Per request: `params`, `headers`, `signal`, `timeout`, `responseType` (`"json" | "text" | "blob" | "arrayBuffer"`).
Without `responseType`, the body is parsed as JSON when the server sends a JSON content type (`application/json`, `application/ld+json`...), as text otherwise, and empty responses (204) give `undefined`.

---

## Project Structure

```
index.ts              # Public exports
src/
  HttpClient.ts       # fetch client, DTO helpers, hooks
  url.ts              # URL and query string builder
  dao/RestDao.ts      # Ready-made REST DAO
  dto/AbstractDto.ts  # Base DTO class with parse()
  enums/              # HttpMethods, HttpCode, HttpType
  errors/Errors.ts    # Typed errors and httpErrorFromStatus()
  interfaces/Dao.ts   # Generic DAO interface
```

---

## Key Concepts

- **DTO**: Typed data transfer objects; override `static parse()` to validate or transform the raw payload.
- **DAO**: Data access objects, factoring HTTP calls for each resource.
- **Error Handling**: Each HTTP code can trigger a specific, easily catchable error.
- **Strong Typing**: All calls are typed, with autocompletion and TypeScript safety.

---

## Contributing

- Fork the repo, submit PRs, or open issues for your needs or suggestions.
- Add your own DTOs/DAOs for your business entities.
- Propose middlewares, helpers, or improvements to error handling.

---

## License

MIT

---

**fecthy** aims to provide a solid, clear, and extensible foundation for all your frontend API calls in TypeScript.
