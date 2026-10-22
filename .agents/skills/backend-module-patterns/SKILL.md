---
name: backend-module-patterns
description: Standard architectural patterns and conventions for creating and extending modules in the PH Healthcare Backend.
---

# Backend Module Architectural Patterns

Use this skill whenever creating a new feature module or updating an existing module in `Backend/src/app/module/`.

## 1. Module File Structure
Every module folder in `src/app/module/<moduleName>/` must strictly follow this 5-file convention:
```
<moduleName>/
├── <moduleName>.interface.ts   # TypeScript interfaces, payload and filter types
├── <moduleName>.validation.ts  # Zod validation schemas
├── <moduleName>.service.ts     # Business logic & Prisma database interactions
├── <moduleName>.controller.ts  # Request handling & HTTP response mapping
└── <moduleName>.route.ts       # Express router with checkAuth & validateRequest
```

## 2. Standard Route Definition
Routes should integrate `checkAuth` (with allowed `Role` enums) and `validateRequest` with the appropriate Zod schema:
```typescript
import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ExampleController } from "./example.controller";
import { ExampleValidation } from "./example.validation";

const router = Router();

router.post(
    "/",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(ExampleValidation.createExampleZodSchema),
    ExampleController.createExample
);

export const ExampleRoutes = router;
```

## 3. Standard Controller & Error Handling
Controllers must wrap handlers in `catchAsync` and format responses using `sendResponse`:
```typescript
import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ExampleService } from "./example.service";

const createExample = catchAsync(async (req: Request, res: Response) => {
    const result = await ExampleService.createExample(req.body, req.user);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Resource created successfully",
        data: result,
    });
});
```

## 4. Standard Service Guidelines
- Use `AppError(statusCode, message)` for business exceptions (e.g. `status.NOT_FOUND`, `status.CONFLICT`, `status.FORBIDDEN`).
- Respect soft-delete rules: check `isDeleted: false` when reading resources.
- Restrict data modifications using `IRequestUser` (from `req.user`) to verify resource ownership unless the caller is `ADMIN` or `SUPER_ADMIN`.
- Mount all new module routes inside `Backend/src/app/routes/index.ts`.
