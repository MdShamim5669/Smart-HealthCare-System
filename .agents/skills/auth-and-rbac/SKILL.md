---
name: auth-and-rbac
description: Guide for handling Better Auth, JWT sessions, role-based access control (SUPER_ADMIN, ADMIN, DOCTOR, PATIENT), and user state checks in PH Healthcare Backend.
---

# Authentication & RBAC Guide

Use this skill when implementing authentication, session refresh logic, user role guards, or security middlewares.

## 1. Roles & Permissions (RBAC)
- **`SUPER_ADMIN`**: Can create and manage `ADMIN` and `DOCTOR` accounts; can access all endpoints.
- **`ADMIN`**: Can manage `DOCTOR`, `SPECIALTY`, and `SCHEDULE` resources; can view all appointments. Cannot create `SUPER_ADMIN` or modify other admins.
- **`DOCTOR`**: Can manage own schedule slots (`/doctor-schedules`), view own appointments, transition appointment states (`SCHEDULED -> INPROGRESS -> COMPLETED` or `CANCELED`), and write 1 prescription per completed appointment.
- **`PATIENT`**: Can book appointments (Pay Now / Pay Later), cancel own scheduled appointments, pay via Stripe, view own prescriptions, and submit 1 review per completed appointment.

## 2. Token & Session Architecture
- **Better Auth Session Cookie**: `better-auth.session_token` stored in HTTP-only secure cookies.
- **Access Token**: JWT stored in `accessToken` cookie (lifetime: 1 day).
- **Refresh Token**: JWT stored in `refreshToken` cookie (lifetime: 7 days).
- **Session Expiry Rule**: Both `expiresIn` and `updateAge` are configured for 1 day (`60 * 60 * 24` seconds).

## 3. Session Refresh Header Logic
When a protected endpoint receives a request, `checkAuth` measures the remaining session lifetime. If less than 20% remains, set response headers:
```typescript
const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
const timeRemaining = expiresAt.getTime() - now.getTime();
const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

if (percentRemaining < 20) {
    res.setHeader('X-Session-Refresh', 'true');
    res.setHeader('X-Session-Expires-At', expiresAt.toISOString());
    res.setHeader('X-Time-Remaining', timeRemaining.toString());
}
```

## 4. checkAuth Verification Checklist
1. Extract `better-auth.session_token` from cookies; throw `AppError(status.UNAUTHORIZED)` if missing.
2. Query `prisma.session` matching token where `expiresAt > new Date()`; throw `AppError(status.UNAUTHORIZED)` if not found.
3. Validate user status: if `user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED`, reject with 401.
4. If `user.isDeleted === true`, reject with 401.
5. If specific roles are passed to `checkAuth(...)`, ensure `authRoles.includes(user.role)`; otherwise throw `AppError(status.FORBIDDEN)`.
6. Attach user info to `req.user` (`userId`, `role`, `email`).
