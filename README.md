# fecthy

**fecthy** is a lightweight TypeScript toolkit to help you structure and secure your HTTP calls on the frontend, with centralized error handling, strong typing, and support for DTO/DAO patterns.

---

## Main Features

- **HttpClient**: Generic HTTP client based on `fetch`, supporting REST methods, dynamic header injection (e.g. Bearer token), and centralized HTTP error handling.
- **Enums**: Constants for HTTP methods (`HttpMethods`), status codes (`HttpCode`), and content types (`HttpType`).
- **Error Handling**: Custom error classes (`HttpError`, `UnauthorizedError`, etc.) and a utility function to throw the right error based on status code.
- **Generic DAO**: Interface and base class to factorize CRUD access to your resources, with strong typing.
- **Modular Structure**: Clear separation between transport, errors, enums, and interfaces.

---

## Installation

```bash
npm install @valomiral/fecthy
# or
yarn add @valomiral/fecthy
```

---

## Quick Example

```typescript
import { HttpClient } from "@valomiral/fecthy";
import UserDto from "./dto/User";

// Create the client with token management
const http = new HttpClient("https://api.example.com", () =>
  localStorage.getItem("token"),
);

// Typed call with DTO validation
const user = await http.getDto("/users/42", UserDto);

// Fine-grained error handling
try {
  const user = await http.getDto("/users/42", UserDto);
} catch (err) {
  if (err instanceof UnauthorizedError) {
    // Redirect to login
  } else if (err instanceof NotFoundError) {
    // Show "user not found"
  } else {
    // Generic error
  }
}
```

---

## Project Structure

```
src/
  HttpClient.ts         # Typed and extensible HTTP client
  enums/
    HttpCode.ts         # HTTP status codes (enum)
    HttpMethods.ts      # HTTP methods (enum)
    HttpType.ts         # HTTP content types (enum)
  errors/
    Errors.ts           # Custom error classes and utility
  interfaces/
    Dao.ts              # Generic DAO interface
  dto/
    User.ts             # Example typed DTO
```

---

## Key Concepts

- **DTO**: Typed data transfer objects, with possible validation via parsers or setters.
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
