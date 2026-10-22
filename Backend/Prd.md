diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/README.md L2B6-Backend-PH-Healthcare-Management-System-development/README.md
--- a/README.md	1970-01-01 00:00:00.000000000 +0000
+++ b/README.md	2026-10-22 18:26:51.917563104 +0000
@@ -0,0 +1,250 @@
+# PH Healthcare Management System: Backend
+
+REST API for an online doctor appointment platform. Patients find a doctor, book a time slot and pay with Stripe. Doctors manage their own availability, appointments, prescriptions and reviews. Admins and super admins run the platform.
+
+## Features
+
+- **Authentication**: email/password and Google login, email OTP verification, password change/forget/reset, session cookie + JWT access/refresh tokens
+- **Role-based access**: `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `PATIENT`
+- **Staff management**: create doctors (with specialties) and admins, update, soft delete
+- **Specialties**: create (with icon upload to Cloudinary), list, delete
+- **Schedules**: admins generate 30-minute slots from a date/time range, doctors pick the slots they work
+- **Appointments**: book with Pay Now or Pay Later, safe against double booking, status rules per role
+- **Payments**: Stripe Checkout (BDT), webhook with signature check and duplicate-event protection
+- **Auto cancel**: a cron job (every 25 minutes) cancels unpaid appointments older than 30 minutes and frees the slot
+- **Prescriptions**: a doctor writes one prescription per completed appointment
+- **Reviews**: a patient reviews a completed appointment, the doctor's average rating updates automatically
+
+## Tech stack
+
+Express 5 · TypeScript · Prisma 7 (PostgreSQL, `@prisma/adapter-pg`) · Better Auth · Stripe · Cloudinary + Multer · Nodemailer + EJS · node-cron · Zod 4 · pnpm
+
+## Getting started
+
+Requirements: Node.js 20.19+, pnpm, a PostgreSQL database, and accounts for Stripe, Cloudinary, Google OAuth and a Gmail App Password.
+
+```bash
+pnpm install
+cp .env.example .env      # then fill in your own values
+pnpm generate             # generate the Prisma client
+pnpm migrate              # apply migrations
+pnpm dev                  # starts on http://localhost:5000
+```
+
+For payments in development, forward Stripe events to the webhook:
+
+```bash
+pnpm stripe:webhook
+```
+
+On first start a super admin is created from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`.
+
+### Scripts
+
+| Script | What it does |
+| --- | --- |
+| `pnpm dev` | Run with hot reload (`tsx watch`) |
+| `pnpm build` / `pnpm start` | Compile to `dist/` and run it |
+| `pnpm generate` | Generate the Prisma client into `src/generated/prisma` |
+| `pnpm migrate` | `prisma migrate dev` |
+| `pnpm studio` | Open Prisma Studio |
+| `pnpm lint` | ESLint |
+
+### Environment variables
+
+See `.env.example` for the full list. Never commit a real `.env`.
+
+| Group | Variables |
+| --- | --- |
+| App | `NODE_ENV`, `PORT`, `FRONTEND_URL` |
+| Database | `DATABASE_URL` |
+| Better Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN`, `BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE` |
+| JWT | `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN` |
+| Email | `EMAIL_SENDER_SMTP_USER`, `_PASS`, `_HOST`, `_PORT`, `_FROM` |
+| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
+| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
+| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
+| Seed | `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` |
+
+## API overview
+
+Base path: `/api/v1`. The Stripe webhook is `POST /webhook` (outside the base path).
+
+### Auth: `/auth`
+
+| Method | Path | Access |
+| --- | --- | --- |
+| POST | `/register` | Public (creates a patient) |
+| POST | `/login` | Public |
+| GET | `/me` | Logged in |
+| POST | `/refresh-token` | Public (needs refresh cookie) |
+| POST | `/change-password`, `/logout` | Logged in |
+| POST | `/verify-email`, `/forget-password`, `/reset-password` | Public |
+| GET | `/login/google`, `/google/success`, `/oauth/error` | Public |
+
+### Users and staff
+
+| Method | Path | Access |
+| --- | --- | --- |
+| POST | `/users/create-doctor` | Admin, Super Admin |
+| POST | `/users/create-admin` | Super Admin |
+| GET | `/doctors` | Public |
+| GET, PATCH, DELETE | `/doctors/:id` | Admin, Super Admin |
+| GET | `/admins`, `/admins/:id` | Admin, Super Admin |
+| PATCH, DELETE | `/admins/:id` | Super Admin |
+| POST | `/specialties` | Admin, Super Admin |
+| GET | `/specialties` | Public |
+| DELETE | `/specialties/:id` | Admin, Super Admin |
+
+### Schedules
+
+| Method | Path | Access |
+| --- | --- | --- |
+| POST, PATCH, DELETE | `/schedules`, `/schedules/:id` | Admin, Super Admin |
+| GET | `/schedules`, `/schedules/:id` | Admin, Super Admin, Doctor |
+| POST | `/doctor-schedules/create-my-doctor-schedule` | Doctor |
+| GET | `/doctor-schedules/my-doctor-schedules` | Doctor |
+| PATCH | `/doctor-schedules/update-my-doctor-schedule` | Doctor |
+| DELETE | `/doctor-schedules/delete-my-doctor-schedule/:id` | Doctor |
+| GET | `/doctor-schedules`, `/doctor-schedules/:doctorId/schedule/:scheduleId` | Admin, Super Admin |
+
+### Appointments: `/appointments`
+
+| Method | Path | Access |
+| --- | --- | --- |
+| POST | `/book-appointment` | Patient (Pay Now, returns a Stripe link) |
+| POST | `/book-appointment-with-pay-later` | Patient |
+| POST | `/initiate-payment/:id` | Patient |
+| GET | `/my-appointments`, `/my-single-appointment/:id` | Patient, Doctor |
+| GET | `/all-appointments` | Admin, Super Admin |
+| PATCH | `/change-appointment-status/:id` | Patient, Doctor, Admin, Super Admin |
+
+Request body for booking: `{ "doctorId": "...", "scheduleId": "..." }`.
+Request body for status change: `{ "status": "INPROGRESS" }`.
+
+Status rules: a doctor can move their own appointment `SCHEDULED → INPROGRESS | CANCELED` and `INPROGRESS → COMPLETED`; a patient can only cancel their own `SCHEDULED` appointment; admins can set any status. Completed and canceled appointments are locked for doctors and patients. Canceling frees the slot.
+
+### Prescriptions: `/prescriptions`
+
+| Method | Path | Access |
+| --- | --- | --- |
+| POST | `/` | Doctor (own, completed appointment, one per appointment) |
+| GET | `/my-prescriptions` | Patient, Doctor |
+| GET | `/` | Admin, Super Admin |
+| GET | `/:id` | Owner, Admin, Super Admin |
+| PATCH | `/:id` | Doctor who wrote it |
+
+Create body: `{ "appointmentId": "...", "followUpDate": "2026-12-01T10:00:00Z", "instructions": "..." }`.
+
+### Reviews: `/reviews`
+
+| Method | Path | Access |
+| --- | --- | --- |
+| POST | `/` | Patient (own, completed appointment, one per appointment) |
+| GET | `/my-reviews` | Patient (written), Doctor (received) |
+| GET | `/doctor/:doctorId` | Public |
+| GET | `/` | Admin, Super Admin |
+| PATCH | `/:id` | Patient who wrote it |
+| DELETE | `/:id` | Author, Admin, Super Admin |
+
+Create body: `{ "appointmentId": "...", "rating": 4.5, "comment": "optional" }` (rating 1 to 5).
+
+## How booking and payment work
+
+1. An admin creates schedule slots (30 minutes each). A doctor selects the slots they work.
+2. A patient books a doctor and slot. The slot is claimed atomically, so two patients cannot book the same one.
+3. **Pay Now** returns a Stripe Checkout link. **Pay Later** books first and the patient calls `initiate-payment` later.
+4. Stripe calls `POST /webhook` on `checkout.session.completed`. The payment and appointment become `PAID`. Repeated events are ignored.
+5. If an appointment is still unpaid after 30 minutes, the cron job cancels it, removes the payment record and frees the slot.
+
+## Core functionality
+
+| Module | What it does | Key rules |
+| --- | --- | --- |
+| Authentication | Patient registration, email OTP verification, email/password and Google login, password change/forget/reset, logout | OTP expires in 2 minutes; login needs a verified email; blocked or deleted users are rejected |
+| Token and session | Login sets a session token, an access token and a refresh token as cookies | Access token 1 day, refresh token 7 days, session 1 day; `checkAuth` verifies both the session and the access token |
+| Role-based access | `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `PATIENT` | Each route lists the roles allowed; creating, updating and deleting admins is Super Admin only |
+| Staff and specialties | Create doctors (with specialties) and admins, update, soft delete; create specialties with an icon, list, delete | A doctor is created in one transaction; creating doctors and specialties is Admin or Super Admin only |
+| Schedule | Admins generate 30-minute slots, doctors pick the slots they work | No duplicate slots; a booked slot cannot be removed |
+| Appointment | Pay Now and Pay Later booking, list own appointments, change status | A slot is claimed atomically so two patients cannot book it; doctors and patients can only change their own appointments; canceling frees the slot |
+| Payment | Stripe Checkout (BDT), webhook, pay later with `initiate-payment` | Webhook signature is verified and duplicate events are ignored; unpaid after 30 minutes means the cron job (every 25 minutes) cancels the appointment |
+| Prescription | A doctor writes and edits prescriptions, the patient reads them | One per `COMPLETED` appointment; only the doctor and patient involved can read it |
+| Review and rating | A patient creates, edits and deletes a review; a doctor's reviews are public | One per `COMPLETED` appointment, rating 1 to 5; the doctor's `averageRating` updates automatically |
+| Platform | Search, filter, pagination and sorting; Zod validation; one error response format; image upload to Cloudinary | Deleting means soft delete |
+
+## Visual documentation
+
+### JWT authentication flow
+
+```mermaid
+sequenceDiagram
+    participant C as Client
+    participant A as API
+    participant D as Database
+
+    Note over C,D: Login
+    C->>A: POST /auth/login
+    A->>D: verify email and password, create session
+    D-->>A: session token
+    A-->>C: cookies: session token, accessToken (1 day), refreshToken (7 days)
+
+    Note over C,D: Protected request
+    C->>A: any protected route + cookies
+    A->>D: find session by token, check it has not expired
+    D-->>A: session + user
+    Note over A: user ACTIVE and not deleted<br/>role allowed for the route<br/>accessToken JWT valid, role in token allowed<br/>X-Session-Refresh header if under 20% of session left
+    A-->>C: next() to the controller, or 401 / 403
+
+    Note over C,D: Refresh
+    C->>A: POST /auth/refresh-token + cookies
+    A-->>C: new accessToken and refreshToken, session lifetime extended
+```
+
+### Business logic flow
+
+```mermaid
+flowchart TD
+    A[1. Admin creates 30-minute slots] --> B[2. Doctor picks the slots they work]
+    B --> C[3. Patient books a slot<br/>claimed atomically, 409 if taken]
+    C --> D[4. Appointment created<br/>status SCHEDULED, payment UNPAID]
+    D --> E[5. Patient pays with Stripe Checkout<br/>at booking, or later with initiate-payment]
+    E --> F[6. Stripe webhook marks payment and appointment PAID]
+    F --> H[7. Doctor starts<br/>SCHEDULED to INPROGRESS]
+    H --> I[8. Doctor completes<br/>INPROGRESS to COMPLETED]
+    I --> J[9a. Doctor writes a prescription]
+    I --> K[9b. Patient writes a review<br/>doctor average rating updates]
+    D -- unpaid after 30 min, or canceled --> G[Canceled, the slot is freed]
+```
+
+## Project structure
+
+```
+src/
+├── app.ts, server.ts        # Express setup, Stripe webhook, cron, bootstrap
+└── app/
+    ├── config/              # env, cloudinary, multer, stripe
+    ├── lib/                 # Better Auth, Prisma client
+    ├── middleware/          # checkAuth, validateRequest, error handlers
+    ├── module/              # admin, appointment, auth, doctor, doctorSchedule,
+    │                        # payment, prescription, review, schedule, specialty, user
+    ├── utils/               # QueryBuilder, jwt, token, cookie, email, seed
+    └── templates/           # EJS email templates
+prisma/
+├── schema/                  # one .prisma file per model
+└── migrations/
+```
+
+Each module follows `route → controller → service`, with a Zod `validation` file and an `interface` file.
+
+## Data model
+
+`User`, `Session`, `Account`, `Verification` (Better Auth) · `Admin`, `Doctor`, `Patient` (each linked 1:1 to a `User`) · `Specialty`, `DoctorSpecialty` · `Schedule`, `DoctorSchedules` · `Appointment`, `Payment`, `Prescription`, `Review` · `MedicalReport`, `PatientHealthData`
+
+## Not built yet
+
+- Medical report upload and patient health data endpoints
+- Patient profile update
+- Video call integration (each appointment already has a unique `videoCallingId`)
+- Refunds for canceled paid appointments
+- Stripe `expired` / `failed` webhook handling
+- Automated tests
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/lib/auth.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/lib/auth.ts
--- a/src/app/lib/auth.ts	2026-10-22 10:37:53.634259134 +0000
+++ b/src/app/lib/auth.ts	2026-10-22 10:38:04.440126495 +0000
@@ -136,11 +136,11 @@
     ],
 
     session: {
-        expiresIn: 60 * 60 * 60 * 24, // 1 day in seconds
-        updateAge: 60 * 60 * 60 * 24, // 1 day in seconds
+        expiresIn: 60 * 60 * 24, // 1 day in seconds
+        updateAge: 60 * 60 * 24, // 1 day in seconds
         cookieCache: {
             enabled: true,
-            maxAge: 60 * 60 * 60 * 24, // 1 day in seconds
+            maxAge: 60 * 60 * 24, // 1 day in seconds
         }
     },
 
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/middleware/checkAuth.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/middleware/checkAuth.ts
--- a/src/app/middleware/checkAuth.ts	2026-10-22 10:37:53.634360351 +0000
+++ b/src/app/middleware/checkAuth.ts	2026-10-22 10:38:04.438112123 +0000
@@ -14,67 +14,57 @@
         const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");
 
         if (!sessionToken) {
-            throw new Error('Unauthorized access! No session token provided.');
+            throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! No session token provided.');
         }
 
-        if (sessionToken) {
-            const sessionExists = await prisma.session.findFirst({
-                where: {
-                    token: sessionToken,
-                    expiresAt: {
-                        gt: new Date(),
-                    }
-                },
-                include: {
-                    user: true,
-                }
-            })
-
-            if (sessionExists && sessionExists.user) {
-                const user = sessionExists.user;
-
-                const now = new Date();
-                const expiresAt = new Date(sessionExists.expiresAt)
-                const createdAt = new Date(sessionExists.createdAt)
-
-                const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
-                const timeRemaining = expiresAt.getTime() - now.getTime();
-                const percentRemaining = (timeRemaining / sessionLifeTime) * 100;
-
-                if (percentRemaining < 20) {
-                    res.setHeader('X-Session-Refresh', 'true');
-                    res.setHeader('X-Session-Expires-At', expiresAt.toISOString());
-                    res.setHeader('X-Time-Remaining', timeRemaining.toString());
-
-                    console.log("Session Expiring Soon!!");
-                }
-
-                if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
-                    throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User is not active.');
-                }
+        const sessionExists = await prisma.session.findFirst({
+            where: {
+                token: sessionToken,
+                expiresAt: {
+                    gt: new Date(),
+                }
+            },
+            include: {
+                user: true,
+            }
+        })
 
-                if (user.isDeleted) {
-                    throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User is deleted.');
-                }
+        if (!sessionExists || !sessionExists.user) {
+            throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! Session is invalid or expired.');
+        }
 
-                if (authRoles.length > 0 && !authRoles.includes(user.role)) {
-                    throw new AppError(status.FORBIDDEN, 'Forbidden access! You do not have permission to access this resource.');
-                }
+        const user = sessionExists.user;
 
-                req.user = {
-                    userId : user.id,
-                    role : user.role,
-                    email : user.email,
-                }
-            }
+        const now = new Date();
+        const expiresAt = new Date(sessionExists.expiresAt)
+        const createdAt = new Date(sessionExists.createdAt)
+
+        const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
+        const timeRemaining = expiresAt.getTime() - now.getTime();
+        const percentRemaining = (timeRemaining / sessionLifeTime) * 100;
+
+        if (percentRemaining < 20) {
+            res.setHeader('X-Session-Refresh', 'true');
+            res.setHeader('X-Session-Expires-At', expiresAt.toISOString());
+            res.setHeader('X-Time-Remaining', timeRemaining.toString());
+        }
 
-            const accessToken = CookieUtils.getCookie(req, 'accessToken');
+        if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
+            throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User is not active.');
+        }
 
-            if (!accessToken) {
-                throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! No access token provided.');
-            }
+        if (user.isDeleted) {
+            throw new AppError(status.UNAUTHORIZED, 'Unauthorized access! User is deleted.');
+        }
 
+        if (authRoles.length > 0 && !authRoles.includes(user.role)) {
+            throw new AppError(status.FORBIDDEN, 'Forbidden access! You do not have permission to access this resource.');
+        }
 
+        req.user = {
+            userId : user.id,
+            role : user.role,
+            email : user.email,
         }
 
         //Access Token Verification
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/middleware/validateRequest.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/middleware/validateRequest.ts
--- a/src/app/middleware/validateRequest.ts	2026-10-22 10:37:53.634542865 +0000
+++ b/src/app/middleware/validateRequest.ts	2026-10-22 10:38:04.437565981 +0000
@@ -10,7 +10,7 @@
         const parsedResult = zodSchema.safeParse(req.body)
 
         if (!parsedResult.success) {
-            next(parsedResult.error)
+            return next(parsedResult.error)
         }
 
         //sanitizing the data
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/appointment/appointment.controller.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/appointment/appointment.controller.ts
--- a/src/app/module/appointment/appointment.controller.ts	2026-10-22 10:37:53.634862007 +0000
+++ b/src/app/module/appointment/appointment.controller.ts	2026-10-22 10:38:32.225798036 +0000
@@ -32,7 +32,7 @@
     const payload = req.body;
     const user = req.user;
 
-    const updatedAppointment = await AppointmentService.changeAppointmentStatus(appointmentId as string, payload, user);
+    const updatedAppointment = await AppointmentService.changeAppointmentStatus(appointmentId as string, payload.status, user);
     sendResponse(res, {
         success: true,
         httpStatusCode: status.OK,
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/appointment/appointment.route.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/appointment/appointment.route.ts
--- a/src/app/module/appointment/appointment.route.ts	2026-10-22 10:37:53.634977696 +0000
+++ b/src/app/module/appointment/appointment.route.ts	2026-10-22 10:38:32.225356574 +0000
@@ -1,16 +1,18 @@
 import { Router } from "express";
 import { Role } from "../../../generated/prisma/enums";
 import { checkAuth } from "../../middleware/checkAuth";
+import { validateRequest } from "../../middleware/validateRequest";
 import { AppointmentController } from "./appointment.controller";
+import { AppointmentValidation } from "./appointment.validation";
 
 const router = Router();
 
-router.post("/book-appointment", checkAuth(Role.PATIENT), AppointmentController.bookAppointment);
+router.post("/book-appointment", checkAuth(Role.PATIENT), validateRequest(AppointmentValidation.bookAppointmentZodSchema), AppointmentController.bookAppointment);
 router.get("/my-appointments", checkAuth(Role.PATIENT, Role.DOCTOR), AppointmentController.getMyAppointments);
-router.patch("/change-appointment-status/:id", checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),AppointmentController.changeAppointmentStatus);
+router.patch("/change-appointment-status/:id", checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), validateRequest(AppointmentValidation.changeAppointmentStatusZodSchema), AppointmentController.changeAppointmentStatus);
 router.get("/my-single-appointment/:id", checkAuth(Role.PATIENT, Role.DOCTOR), AppointmentController.getMySingleAppointment);
 router.get("/all-appointments", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AppointmentController.getAllAppointments);
-router.post("/book-appointment-with-pay-later", checkAuth(Role.PATIENT), AppointmentController.bookAppointmentWithPayLater);
+router.post("/book-appointment-with-pay-later", checkAuth(Role.PATIENT), validateRequest(AppointmentValidation.bookAppointmentZodSchema), AppointmentController.bookAppointmentWithPayLater);
 router.post("/initiate-payment/:id", checkAuth(Role.PATIENT), AppointmentController.initiatePayment);
 
 export const AppointmentRoutes = router;
\ No newline at end of file
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/appointment/appointment.service.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/appointment/appointment.service.ts
--- a/src/app/module/appointment/appointment.service.ts	2026-10-22 10:37:53.635008931 +0000
+++ b/src/app/module/appointment/appointment.service.ts	2026-10-22 10:38:32.224639117 +0000
@@ -7,9 +7,24 @@
 import AppError from "../../errorHelpers/AppError";
 import { IRequestUser } from "../../interfaces/requestUser.interface";
 import { prisma } from "../../lib/prisma";
+import { Prisma } from "../../../generated/prisma/client";
 import { AppointmentStatus } from './../../../generated/prisma/enums';
 import { IBookAppointmentPayload } from "./appointment.interface";
 
+
+// Atomically claims a schedule slot. If another patient already holds it, nothing is updated
+// and we reject, which prevents two patients from booking the same slot.
+const reserveSlot = async (tx: Prisma.TransactionClient, doctorId: string, scheduleId: string) => {
+    const reserved = await tx.doctorSchedules.updateMany({
+        where: { doctorId, scheduleId, isBooked: false },
+        data: { isBooked: true },
+    });
+
+    if (reserved.count === 0) {
+        throw new AppError(status.CONFLICT, "This schedule slot is already booked");
+    }
+}
+
 // Pay Now Book Appointment
 const bookAppointment = async (payload : IBookAppointmentPayload, user : IRequestUser) => {
    const patientData = await prisma.patient.findUniqueOrThrow({
@@ -40,9 +55,15 @@
     }
    });
    
+    if (doctorSchedule.isBooked) {
+        throw new AppError(status.CONFLICT, "This schedule slot is already booked");
+    }
+
     const videoCallingId = String(uuidv7());
 
     const result = await prisma.$transaction(async (tx) => {
+        await reserveSlot(tx, payload.doctorId, payload.scheduleId);
+
         const appointmentData = await tx.appointment.create({
             data : {
                 doctorId : payload.doctorId,
@@ -52,18 +73,6 @@
             }
         });
 
-        await tx.doctorSchedules.update({
-            where : {
-                doctorId_scheduleId:{
-                    doctorId : payload.doctorId,
-                    scheduleId : payload.scheduleId,
-                }
-            },
-            data : {
-                isBooked : true,
-            }
-        });
-
         //TODO : Payment Integration will be here
 
         const transactionId = String(uuidv7());
@@ -160,40 +169,82 @@
 
 }
 
-// 1. Completed Or Cancelled Appointments should not be allowed to update status
-// 2. Doctors can only update Appoinment status from schedule to inprogress or inprogress to complted or schedule to cancelled.
-// 3. Patients can only cancel the scheduled appointment if it scheduled not completed or cancelled or inprogress. 
-// 4. Admin and Super admin can update to any status.
+// Rules
+// 1. Completed or canceled appointments cannot be changed (except by admin / super admin).
+// 2. Doctors (own appointments only): SCHEDULED -> INPROGRESS or CANCELED, INPROGRESS -> COMPLETED.
+// 3. Patients (own appointments only): SCHEDULED -> CANCELED.
+// 4. Admin and Super admin can set any status.
+const doctorTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
+    [AppointmentStatus.SCHEDULED]: [AppointmentStatus.INPROGRESS, AppointmentStatus.CANCELED],
+    [AppointmentStatus.INPROGRESS]: [AppointmentStatus.COMPLETED],
+    [AppointmentStatus.COMPLETED]: [],
+    [AppointmentStatus.CANCELED]: [],
+};
+
+const patientTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
+    [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CANCELED],
+    [AppointmentStatus.INPROGRESS]: [],
+    [AppointmentStatus.COMPLETED]: [],
+    [AppointmentStatus.CANCELED]: [],
+};
 
-const changeAppointmentStatus = async (appointmentId: string, appointmentStatus: AppointmentStatus, user: IRequestUser) => {
+const changeAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus, user: IRequestUser) => {
     const appointmentData = await prisma.appointment.findUniqueOrThrow({
         where: {
             id: appointmentId,
-            // status: AppointmentStatus.SCHEDULED
         },
         include: {
-            doctor: true
+            doctor: true,
+            patient: true,
         }
     });
 
-    // if (!appointmentData) {
-    //     throw new AppError(status.NOT_FOUND, "Appointment not found or already completed/cancelled");
-    // }
+    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
 
-    if (user?.role === Role.DOCTOR) {
-        if (!(user?.email === appointmentData.doctor.email))
-            throw new AppError(status.BAD_REQUEST, "This is not your appointment")
+    if (!isAdmin) {
+        if (user.role === Role.DOCTOR && appointmentData.doctor.email !== user.email) {
+            throw new AppError(status.FORBIDDEN, "This is not your appointment");
+        }
+
+        if (user.role === Role.PATIENT && appointmentData.patient.email !== user.email) {
+            throw new AppError(status.FORBIDDEN, "This is not your appointment");
+        }
+
+        const transitions = user.role === Role.DOCTOR ? doctorTransitions : patientTransitions;
+
+        if (!transitions[appointmentData.status].includes(newStatus)) {
+            throw new AppError(
+                status.BAD_REQUEST,
+                `You cannot change an appointment from ${appointmentData.status} to ${newStatus}`
+            );
+        }
     }
 
-    return await prisma.appointment.update({
-        where: {
-            id: appointmentId
-        },
-        data: {
-            status: appointmentStatus
+    return await prisma.$transaction(async (tx) => {
+        const updated = await tx.appointment.update({
+            where: {
+                id: appointmentId
+            },
+            data: {
+                status: newStatus
+            }
+        });
+
+        // A canceled appointment gives its slot back
+        if (newStatus === AppointmentStatus.CANCELED && appointmentData.status !== AppointmentStatus.CANCELED) {
+            await tx.doctorSchedules.updateMany({
+                where: {
+                    doctorId: appointmentData.doctorId,
+                    scheduleId: appointmentData.scheduleId,
+                },
+                data: {
+                    isBooked: false,
+                }
+            });
         }
-    })
 
+        return updated;
+    });
 }
 
 // refactoring on include of doctor and patient data in appointment details, we can use query builder to get the data in single query instead of multiple queries in case of doctor and patient both
@@ -285,9 +336,15 @@
         }
     });
 
+    if (doctorSchedule.isBooked) {
+        throw new AppError(status.CONFLICT, "This schedule slot is already booked");
+    }
+
     const videoCallingId = String(uuidv7());
 
     const result = await prisma.$transaction(async (tx) => {
+        await reserveSlot(tx, payload.doctorId, payload.scheduleId);
+
         const appointmentData = await tx.appointment.create({
             data: {
                 doctorId: payload.doctorId,
@@ -297,18 +354,6 @@
             }
         });
 
-        await tx.doctorSchedules.update({
-            where: {
-                doctorId_scheduleId: {
-                    doctorId: payload.doctorId,
-                    scheduleId: payload.scheduleId,
-                }
-            },
-            data: {
-                isBooked: true,
-            }
-        });
-
         const transactionId = String(uuidv7());
 
         const paymentData = await tx.payment.create({
@@ -399,7 +444,7 @@
 
     const unpaidAppointments = await prisma.appointment.findMany({
         where: {
-            // status: AppointmentStatus.SCHEDULED,
+            status: AppointmentStatus.SCHEDULED,
             createdAt: {
                 lte: thirtyMinutesAgo,
             },
@@ -407,6 +452,10 @@
         },
     });
 
+    if (unpaidAppointments.length === 0) {
+        return;
+    }
+
     const appointmentToCancel = unpaidAppointments.map(appointment => appointment.id);
 
     await prisma.$transaction(async (tx) => {
@@ -431,12 +480,10 @@
         });
 
         for(const unpaidAppointment of unpaidAppointments){
-            await tx.doctorSchedules.update({
+            await tx.doctorSchedules.updateMany({
                 where: {
-                    doctorId_scheduleId: {
-                        doctorId: unpaidAppointment.doctorId,
-                        scheduleId: unpaidAppointment.scheduleId,
-                    },
+                    doctorId: unpaidAppointment.doctorId,
+                    scheduleId: unpaidAppointment.scheduleId,
                 },
                 data: {
                     isBooked: false,
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/appointment/appointment.validation.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/appointment/appointment.validation.ts
--- a/src/app/module/appointment/appointment.validation.ts	2026-10-22 10:37:53.635008931 +0000
+++ b/src/app/module/appointment/appointment.validation.ts	2026-10-22 10:38:32.224885622 +0000
@@ -0,0 +1,16 @@
+import z from "zod";
+import { AppointmentStatus } from "../../../generated/prisma/enums";
+
+const bookAppointmentZodSchema = z.object({
+    doctorId: z.uuid("Doctor id must be a valid id"),
+    scheduleId: z.uuid("Schedule id must be a valid id"),
+});
+
+const changeAppointmentStatusZodSchema = z.object({
+    status: z.enum(AppointmentStatus, "Status must be SCHEDULED, INPROGRESS, COMPLETED or CANCELED"),
+});
+
+export const AppointmentValidation = {
+    bookAppointmentZodSchema,
+    changeAppointmentStatusZodSchema,
+};
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/prescription/prescription.controller.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/prescription/prescription.controller.ts
--- a/src/app/module/prescription/prescription.controller.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/prescription/prescription.controller.ts	2026-10-22 10:38:50.868173627 +0000
@@ -0,0 +1,63 @@
+import { Request, Response } from "express";
+import status from "http-status";
+import { catchAsync } from "../../shared/catchAsync";
+import { sendResponse } from "../../shared/sendResponse";
+import { PrescriptionService } from "./prescription.service";
+
+const createPrescription = catchAsync(async (req: Request, res: Response) => {
+    const result = await PrescriptionService.createPrescription(req.body, req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.CREATED,
+        message: "Prescription created successfully",
+        data: result,
+    });
+});
+
+const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
+    const result = await PrescriptionService.getMyPrescriptions(req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "Prescriptions retrieved successfully",
+        data: result,
+    });
+});
+
+const getAllPrescriptions = catchAsync(async (req: Request, res: Response) => {
+    const result = await PrescriptionService.getAllPrescriptions();
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "All prescriptions retrieved successfully",
+        data: result,
+    });
+});
+
+const getPrescriptionById = catchAsync(async (req: Request, res: Response) => {
+    const result = await PrescriptionService.getPrescriptionById(req.params.id as string, req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "Prescription retrieved successfully",
+        data: result,
+    });
+});
+
+const updatePrescription = catchAsync(async (req: Request, res: Response) => {
+    const result = await PrescriptionService.updatePrescription(req.params.id as string, req.body, req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "Prescription updated successfully",
+        data: result,
+    });
+});
+
+export const PrescriptionController = {
+    createPrescription,
+    getMyPrescriptions,
+    getAllPrescriptions,
+    getPrescriptionById,
+    updatePrescription,
+};
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/prescription/prescription.interface.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/prescription/prescription.interface.ts
--- a/src/app/module/prescription/prescription.interface.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/prescription/prescription.interface.ts	2026-10-22 10:38:50.864036202 +0000
@@ -0,0 +1,10 @@
+export interface ICreatePrescriptionPayload {
+    appointmentId: string;
+    followUpDate: Date;
+    instructions: string;
+}
+
+export interface IUpdatePrescriptionPayload {
+    followUpDate?: Date;
+    instructions?: string;
+}
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/prescription/prescription.route.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/prescription/prescription.route.ts
--- a/src/app/module/prescription/prescription.route.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/prescription/prescription.route.ts	2026-10-22 10:38:50.869485701 +0000
@@ -0,0 +1,26 @@
+import { Router } from "express";
+import { Role } from "../../../generated/prisma/enums";
+import { checkAuth } from "../../middleware/checkAuth";
+import { validateRequest } from "../../middleware/validateRequest";
+import { PrescriptionController } from "./prescription.controller";
+import { PrescriptionValidation } from "./prescription.validation";
+
+const router = Router();
+
+router.post("/",
+    checkAuth(Role.DOCTOR),
+    validateRequest(PrescriptionValidation.createPrescriptionZodSchema),
+    PrescriptionController.createPrescription);
+
+router.get("/my-prescriptions", checkAuth(Role.PATIENT, Role.DOCTOR), PrescriptionController.getMyPrescriptions);
+
+router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), PrescriptionController.getAllPrescriptions);
+
+router.get("/:id", checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN), PrescriptionController.getPrescriptionById);
+
+router.patch("/:id",
+    checkAuth(Role.DOCTOR),
+    validateRequest(PrescriptionValidation.updatePrescriptionZodSchema),
+    PrescriptionController.updatePrescription);
+
+export const PrescriptionRoutes = router;
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/prescription/prescription.service.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/prescription/prescription.service.ts
--- a/src/app/module/prescription/prescription.service.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/prescription/prescription.service.ts	2026-10-22 10:38:50.866929226 +0000
@@ -0,0 +1,147 @@
+import status from "http-status";
+import { AppointmentStatus, Role } from "../../../generated/prisma/enums";
+import AppError from "../../errorHelpers/AppError";
+import { IRequestUser } from "../../interfaces/requestUser.interface";
+import { prisma } from "../../lib/prisma";
+import { ICreatePrescriptionPayload, IUpdatePrescriptionPayload } from "./prescription.interface";
+
+const prescriptionInclude = {
+    doctor: { select: { id: true, name: true, email: true, designation: true } },
+    patient: { select: { id: true, name: true, email: true } },
+    appointment: { select: { id: true, status: true, scheduleId: true } },
+};
+
+// Doctor writes a prescription for one of their own completed appointments (one per appointment)
+const createPrescription = async (payload: ICreatePrescriptionPayload, user: IRequestUser) => {
+    const doctorData = await prisma.doctor.findFirst({
+        where: { email: user.email, isDeleted: false },
+    });
+
+    if (!doctorData) {
+        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
+    }
+
+    const appointmentData = await prisma.appointment.findUnique({
+        where: { id: payload.appointmentId },
+        include: { prescription: true },
+    });
+
+    if (!appointmentData) {
+        throw new AppError(status.NOT_FOUND, "Appointment not found");
+    }
+
+    if (appointmentData.doctorId !== doctorData.id) {
+        throw new AppError(status.FORBIDDEN, "This is not your appointment");
+    }
+
+    if (appointmentData.status !== AppointmentStatus.COMPLETED) {
+        throw new AppError(status.BAD_REQUEST, "A prescription can only be given for a completed appointment");
+    }
+
+    if (appointmentData.prescription) {
+        throw new AppError(status.CONFLICT, "A prescription already exists for this appointment");
+    }
+
+    return await prisma.prescription.create({
+        data: {
+            appointmentId: appointmentData.id,
+            doctorId: doctorData.id,
+            patientId: appointmentData.patientId,
+            followUpDate: payload.followUpDate,
+            instructions: payload.instructions,
+        },
+        include: prescriptionInclude,
+    });
+};
+
+// Patients see prescriptions written for them, doctors see the ones they wrote
+const getMyPrescriptions = async (user: IRequestUser) => {
+    if (user.role === Role.PATIENT) {
+        const patientData = await prisma.patient.findUnique({ where: { email: user.email } });
+
+        if (!patientData) {
+            throw new AppError(status.NOT_FOUND, "Patient profile not found");
+        }
+
+        return await prisma.prescription.findMany({
+            where: { patientId: patientData.id },
+            include: prescriptionInclude,
+            orderBy: { createdAt: "desc" },
+        });
+    }
+
+    const doctorData = await prisma.doctor.findUnique({ where: { email: user.email } });
+
+    if (!doctorData) {
+        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
+    }
+
+    return await prisma.prescription.findMany({
+        where: { doctorId: doctorData.id },
+        include: prescriptionInclude,
+        orderBy: { createdAt: "desc" },
+    });
+};
+
+const getAllPrescriptions = async () => {
+    return await prisma.prescription.findMany({
+        include: prescriptionInclude,
+        orderBy: { createdAt: "desc" },
+    });
+};
+
+const getPrescriptionById = async (prescriptionId: string, user: IRequestUser) => {
+    const prescription = await prisma.prescription.findUnique({
+        where: { id: prescriptionId },
+        include: prescriptionInclude,
+    });
+
+    if (!prescription) {
+        throw new AppError(status.NOT_FOUND, "Prescription not found");
+    }
+
+    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
+
+    if (!isAdmin) {
+        const ownerEmail = user.role === Role.DOCTOR ? prescription.doctor.email : prescription.patient.email;
+
+        if (ownerEmail !== user.email) {
+            throw new AppError(status.FORBIDDEN, "You do not have access to this prescription");
+        }
+    }
+
+    return prescription;
+};
+
+// Only the doctor who wrote it can edit it
+const updatePrescription = async (prescriptionId: string, payload: IUpdatePrescriptionPayload, user: IRequestUser) => {
+    const prescription = await prisma.prescription.findUnique({
+        where: { id: prescriptionId },
+        include: { doctor: true },
+    });
+
+    if (!prescription) {
+        throw new AppError(status.NOT_FOUND, "Prescription not found");
+    }
+
+    if (prescription.doctor.email !== user.email) {
+        throw new AppError(status.FORBIDDEN, "This is not your prescription");
+    }
+
+    return await prisma.prescription.update({
+        where: { id: prescriptionId },
+        data: {
+            followUpDate: payload.followUpDate,
+            instructions: payload.instructions,
+        },
+        include: prescriptionInclude,
+    });
+};
+
+export const PrescriptionService = {
+    createPrescription,
+    getMyPrescriptions,
+    getAllPrescriptions,
+    getPrescriptionById,
+    updatePrescription,
+};
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/prescription/prescription.validation.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/prescription/prescription.validation.ts
--- a/src/app/module/prescription/prescription.validation.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/prescription/prescription.validation.ts	2026-10-22 10:38:50.864163754 +0000
@@ -0,0 +1,27 @@
+import z from "zod";
+
+const createPrescriptionZodSchema = z.object({
+    appointmentId: z.uuid("Appointment id must be a valid id"),
+    followUpDate: z.coerce.date("Follow-up date must be a valid date")
+        .refine((date) => date.getTime() > Date.now(), "Follow-up date must be in the future"),
+    instructions: z.string("Instructions are required")
+        .min(5, "Instructions must be at least 5 characters")
+        .max(2000, "Instructions must be at most 2000 characters"),
+});
+
+const updatePrescriptionZodSchema = z.object({
+    followUpDate: z.coerce.date("Follow-up date must be a valid date")
+        .refine((date) => date.getTime() > Date.now(), "Follow-up date must be in the future")
+        .optional(),
+    instructions: z.string()
+        .min(5, "Instructions must be at least 5 characters")
+        .max(2000, "Instructions must be at most 2000 characters")
+        .optional(),
+}).refine((data) => data.followUpDate !== undefined || data.instructions !== undefined, {
+    message: "Provide followUpDate or instructions to update",
+});
+
+export const PrescriptionValidation = {
+    createPrescriptionZodSchema,
+    updatePrescriptionZodSchema,
+};
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/review/review.controller.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/review/review.controller.ts
--- a/src/app/module/review/review.controller.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/review/review.controller.ts	2026-10-22 10:39:12.467422236 +0000
@@ -0,0 +1,74 @@
+import { Request, Response } from "express";
+import status from "http-status";
+import { catchAsync } from "../../shared/catchAsync";
+import { sendResponse } from "../../shared/sendResponse";
+import { ReviewService } from "./review.service";
+
+const createReview = catchAsync(async (req: Request, res: Response) => {
+    const result = await ReviewService.createReview(req.body, req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.CREATED,
+        message: "Review created successfully",
+        data: result,
+    });
+});
+
+const getMyReviews = catchAsync(async (req: Request, res: Response) => {
+    const result = await ReviewService.getMyReviews(req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "Reviews retrieved successfully",
+        data: result,
+    });
+});
+
+const getDoctorReviews = catchAsync(async (req: Request, res: Response) => {
+    const result = await ReviewService.getDoctorReviews(req.params.doctorId as string);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "Doctor reviews retrieved successfully",
+        data: result,
+    });
+});
+
+const getAllReviews = catchAsync(async (req: Request, res: Response) => {
+    const result = await ReviewService.getAllReviews();
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "All reviews retrieved successfully",
+        data: result,
+    });
+});
+
+const updateReview = catchAsync(async (req: Request, res: Response) => {
+    const result = await ReviewService.updateReview(req.params.id as string, req.body, req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "Review updated successfully",
+        data: result,
+    });
+});
+
+const deleteReview = catchAsync(async (req: Request, res: Response) => {
+    const result = await ReviewService.deleteReview(req.params.id as string, req.user);
+    sendResponse(res, {
+        success: true,
+        httpStatusCode: status.OK,
+        message: "Review deleted successfully",
+        data: result,
+    });
+});
+
+export const ReviewController = {
+    createReview,
+    getMyReviews,
+    getDoctorReviews,
+    getAllReviews,
+    updateReview,
+    deleteReview,
+};
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/review/review.interface.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/review/review.interface.ts
--- a/src/app/module/review/review.interface.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/review/review.interface.ts	2026-10-22 10:39:12.463451759 +0000
@@ -0,0 +1,10 @@
+export interface ICreateReviewPayload {
+    appointmentId: string;
+    rating: number;
+    comment?: string;
+}
+
+export interface IUpdateReviewPayload {
+    rating?: number;
+    comment?: string;
+}
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/review/review.route.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/review/review.route.ts
--- a/src/app/module/review/review.route.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/review/review.route.ts	2026-10-22 10:39:12.468163551 +0000
@@ -0,0 +1,29 @@
+import { Router } from "express";
+import { Role } from "../../../generated/prisma/enums";
+import { checkAuth } from "../../middleware/checkAuth";
+import { validateRequest } from "../../middleware/validateRequest";
+import { ReviewController } from "./review.controller";
+import { ReviewValidation } from "./review.validation";
+
+const router = Router();
+
+router.post("/",
+    checkAuth(Role.PATIENT),
+    validateRequest(ReviewValidation.createReviewZodSchema),
+    ReviewController.createReview);
+
+router.get("/my-reviews", checkAuth(Role.PATIENT, Role.DOCTOR), ReviewController.getMyReviews);
+
+// Public: anyone can read the reviews of a doctor
+router.get("/doctor/:doctorId", ReviewController.getDoctorReviews);
+
+router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), ReviewController.getAllReviews);
+
+router.patch("/:id",
+    checkAuth(Role.PATIENT),
+    validateRequest(ReviewValidation.updateReviewZodSchema),
+    ReviewController.updateReview);
+
+router.delete("/:id", checkAuth(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN), ReviewController.deleteReview);
+
+export const ReviewRoutes = router;
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/review/review.service.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/review/review.service.ts
--- a/src/app/module/review/review.service.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/review/review.service.ts	2026-10-22 10:39:12.466298465 +0000
@@ -0,0 +1,196 @@
+import status from "http-status";
+import { Prisma } from "../../../generated/prisma/client";
+import { AppointmentStatus, Role } from "../../../generated/prisma/enums";
+import AppError from "../../errorHelpers/AppError";
+import { IRequestUser } from "../../interfaces/requestUser.interface";
+import { prisma } from "../../lib/prisma";
+import { ICreateReviewPayload, IUpdateReviewPayload } from "./review.interface";
+
+// Recalculates the doctor's average rating from all of their reviews
+const refreshDoctorRating = async (tx: Prisma.TransactionClient, doctorId: string) => {
+    const result = await tx.review.aggregate({
+        where: { doctorId },
+        _avg: { rating: true },
+    });
+
+    await tx.doctor.update({
+        where: { id: doctorId },
+        data: { averageRating: Number((result._avg.rating ?? 0).toFixed(1)) },
+    });
+};
+
+const getPatientOrThrow = async (user: IRequestUser) => {
+    const patientData = await prisma.patient.findUnique({ where: { email: user.email } });
+
+    if (!patientData) {
+        throw new AppError(status.NOT_FOUND, "Patient profile not found");
+    }
+
+    return patientData;
+};
+
+// A patient can review a completed appointment of their own, once
+const createReview = async (payload: ICreateReviewPayload, user: IRequestUser) => {
+    const patientData = await getPatientOrThrow(user);
+
+    const appointmentData = await prisma.appointment.findUnique({
+        where: { id: payload.appointmentId },
+        include: { review: true },
+    });
+
+    if (!appointmentData) {
+        throw new AppError(status.NOT_FOUND, "Appointment not found");
+    }
+
+    if (appointmentData.patientId !== patientData.id) {
+        throw new AppError(status.FORBIDDEN, "This is not your appointment");
+    }
+
+    if (appointmentData.status !== AppointmentStatus.COMPLETED) {
+        throw new AppError(status.BAD_REQUEST, "You can only review a completed appointment");
+    }
+
+    if (appointmentData.review) {
+        throw new AppError(status.CONFLICT, "You have already reviewed this appointment");
+    }
+
+    return await prisma.$transaction(async (tx) => {
+        const review = await tx.review.create({
+            data: {
+                appointmentId: appointmentData.id,
+                patientId: patientData.id,
+                doctorId: appointmentData.doctorId,
+                rating: payload.rating,
+                comment: payload.comment,
+            },
+        });
+
+        await refreshDoctorRating(tx, appointmentData.doctorId);
+
+        return review;
+    });
+};
+
+// Patients see the reviews they wrote, doctors see the reviews they received
+const getMyReviews = async (user: IRequestUser) => {
+    if (user.role === Role.PATIENT) {
+        const patientData = await getPatientOrThrow(user);
+
+        return await prisma.review.findMany({
+            where: { patientId: patientData.id },
+            include: { doctor: { select: { id: true, name: true, designation: true } } },
+            orderBy: { createdAt: "desc" },
+        });
+    }
+
+    const doctorData = await prisma.doctor.findUnique({ where: { email: user.email } });
+
+    if (!doctorData) {
+        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
+    }
+
+    return await prisma.review.findMany({
+        where: { doctorId: doctorData.id },
+        include: { patient: { select: { id: true, name: true } } },
+        orderBy: { createdAt: "desc" },
+    });
+};
+
+// Public: reviews of one doctor, showing only the patient's name
+const getDoctorReviews = async (doctorId: string) => {
+    const doctorData = await prisma.doctor.findFirst({
+        where: { id: doctorId, isDeleted: false },
+        select: { id: true, name: true, averageRating: true },
+    });
+
+    if (!doctorData) {
+        throw new AppError(status.NOT_FOUND, "Doctor not found");
+    }
+
+    const reviews = await prisma.review.findMany({
+        where: { doctorId },
+        select: {
+            id: true,
+            rating: true,
+            comment: true,
+            createdAt: true,
+            patient: { select: { name: true } },
+        },
+        orderBy: { createdAt: "desc" },
+    });
+
+    return { doctor: doctorData, reviews };
+};
+
+const getAllReviews = async () => {
+    return await prisma.review.findMany({
+        include: {
+            doctor: { select: { id: true, name: true } },
+            patient: { select: { id: true, name: true } },
+        },
+        orderBy: { createdAt: "desc" },
+    });
+};
+
+// Only the patient who wrote it can edit it
+const updateReview = async (reviewId: string, payload: IUpdateReviewPayload, user: IRequestUser) => {
+    const patientData = await getPatientOrThrow(user);
+
+    const review = await prisma.review.findUnique({ where: { id: reviewId } });
+
+    if (!review) {
+        throw new AppError(status.NOT_FOUND, "Review not found");
+    }
+
+    if (review.patientId !== patientData.id) {
+        throw new AppError(status.FORBIDDEN, "This is not your review");
+    }
+
+    return await prisma.$transaction(async (tx) => {
+        const updated = await tx.review.update({
+            where: { id: reviewId },
+            data: {
+                rating: payload.rating,
+                comment: payload.comment,
+            },
+        });
+
+        await refreshDoctorRating(tx, review.doctorId);
+
+        return updated;
+    });
+};
+
+// The author or an admin can delete a review
+const deleteReview = async (reviewId: string, user: IRequestUser) => {
+    const review = await prisma.review.findUnique({
+        where: { id: reviewId },
+        include: { patient: true },
+    });
+
+    if (!review) {
+        throw new AppError(status.NOT_FOUND, "Review not found");
+    }
+
+    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
+
+    if (!isAdmin && review.patient.email !== user.email) {
+        throw new AppError(status.FORBIDDEN, "This is not your review");
+    }
+
+    await prisma.$transaction(async (tx) => {
+        await tx.review.delete({ where: { id: reviewId } });
+        await refreshDoctorRating(tx, review.doctorId);
+    });
+
+    return { id: reviewId };
+};
+
+export const ReviewService = {
+    createReview,
+    getMyReviews,
+    getDoctorReviews,
+    getAllReviews,
+    updateReview,
+    deleteReview,
+};
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/review/review.validation.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/review/review.validation.ts
--- a/src/app/module/review/review.validation.ts	1970-01-01 00:00:00.000000000 +0000
+++ b/src/app/module/review/review.validation.ts	2026-10-22 10:39:12.464163551 +0000
@@ -0,0 +1,19 @@
+import z from "zod";
+
+const createReviewZodSchema = z.object({
+    appointmentId: z.uuid("Appointment id must be a valid id"),
+    rating: z.number("Rating is required").min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
+    comment: z.string().max(500, "Comment must be at most 500 characters").optional(),
+});
+
+const updateReviewZodSchema = z.object({
+    rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5").optional(),
+    comment: z.string().max(500, "Comment must be at most 500 characters").optional(),
+}).refine((data) => data.rating !== undefined || data.comment !== undefined, {
+    message: "Provide rating or comment to update",
+});
+
+export const ReviewValidation = {
+    createReviewZodSchema,
+    updateReviewZodSchema,
+};
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/specialty/specialty.route.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/specialty/specialty.route.ts
--- a/src/app/module/specialty/specialty.route.ts	2026-10-22 10:37:53.637291783 +0000
+++ b/src/app/module/specialty/specialty.route.ts	2026-10-22 10:38:04.439656518 +0000
@@ -10,7 +10,7 @@
 const router = Router();
 
 router.post('/', 
-    // checkAuth(Role.ADMIN, Role.SUPER_ADMIN), 
+    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
     multerUpload.single("file"), 
     validateRequest(SpecialtyValidation.createSpecialtyZodSchema),
     SpecialtyController.createSpecialty);
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/user/user.route.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/user/user.route.ts
--- a/src/app/module/user/user.route.ts	2026-10-22 10:37:53.637465591 +0000
+++ b/src/app/module/user/user.route.ts	2026-10-22 10:38:04.438605320 +0000
@@ -3,7 +3,7 @@
 import { checkAuth } from "../../middleware/checkAuth";
 import { validateRequest } from "../../middleware/validateRequest";
 import { UserController } from "./user.controller";
-import { createDoctorZodSchema } from "./user.validation";
+import { createAdminZodSchema, createDoctorZodSchema } from "./user.validation";
 
 
 
@@ -28,13 +28,16 @@
 
     // }, 
 
+    checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
     validateRequest(createDoctorZodSchema),
 
     UserController.createDoctor);
 
 
+// Only a super admin can create admin / super admin accounts
 router.post("/create-admin",
-    checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
+    checkAuth(Role.SUPER_ADMIN),
+    validateRequest(createAdminZodSchema),
     UserController.createAdmin);
 
 export const UserRoutes = router;
\ No newline at end of file
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/module/user/user.service.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/module/user/user.service.ts
--- a/src/app/module/user/user.service.ts	2026-10-22 10:37:53.637494794 +0000
+++ b/src/app/module/user/user.service.ts	2026-10-22 10:38:04.439177387 +0000
@@ -132,7 +132,7 @@
 }
 
 const createAdmin = async (payload: ICreateAdminPayload) => {
-    //TODO: Validate who is creating the admin user. Only super admin can create admin user and only super admin can create super admin user but admin user cannot create super admin user
+    // Access is restricted to SUPER_ADMIN in user.route.ts and `role` is validated by createAdminZodSchema
 
     const userExists = await prisma.user.findUnique({
         where: {
diff -ruN '--exclude=node_modules' '--exclude=generated' '--exclude=.env' '--exclude=.env.example' '--exclude=dist' ../orig/src/app/routes/index.ts L2B6-Backend-PH-Healthcare-Management-System-development/src/app/routes/index.ts
--- a/src/app/routes/index.ts	2026-10-22 10:37:53.637653286 +0000
+++ b/src/app/routes/index.ts	2026-10-22 10:39:12.496953345 +0000
@@ -4,6 +4,8 @@
 import { AuthRoutes } from "../module/auth/auth.route";
 import { DoctorRoutes } from "../module/doctor/doctor.route";
 import { DoctorScheduleRoutes } from "../module/doctorSchedule/doctorSchedule.route";
+import { PrescriptionRoutes } from "../module/prescription/prescription.route";
+import { ReviewRoutes } from "../module/review/review.route";
 import { scheduleRoutes } from "../module/schedule/schedule.route";
 import { SpecialtyRoutes } from "../module/specialty/specialty.route";
 import { UserRoutes } from "../module/user/user.route";
@@ -18,6 +20,8 @@
 router.use("/schedules", scheduleRoutes)
 router.use("/doctor-schedules", DoctorScheduleRoutes)
 router.use("/appointments", AppointmentRoutes)
+router.use("/prescriptions", PrescriptionRoutes)
+router.use("/reviews", ReviewRoutes)
 
 
 export const IndexRoutes = router;
\ No newline at end of file