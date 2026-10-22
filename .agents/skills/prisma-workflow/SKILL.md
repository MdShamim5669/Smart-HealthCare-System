---
name: prisma-workflow
description: Workflow for managing Prisma 7 multi-file schemas, migrations, client generation, transactions, and concurrency patterns in the PH Healthcare Backend.
---

# Prisma 7 Workflow & Best Practices

Use this skill whenever editing database schemas, running migrations, writing complex Prisma queries, or dealing with transactions and concurrency in the PH Healthcare backend.

## 1. Schema Conventions
- **Multi-file Schemas**: Keep individual models in `Backend/prisma/schema/*.prisma`.
- **Database Adapter**: Uses PostgreSQL with `@prisma/adapter-pg`.
- **Enums**: Place common enums (e.g., `Role`, `UserStatus`, `AppointmentStatus`, `PaymentStatus`) in dedicated schema files or export them from `src/generated/prisma/enums`.
- **Soft Deletion**: For tables supporting soft deletion (e.g., `User`, `Admin`, `Doctor`, `Patient`), ensure the `isDeleted: Boolean @default(false)` field exists and is filtered in standard queries (`where: { isDeleted: false }`).

## 2. Common CLI Commands
Always run Prisma commands from inside the `Backend/` directory:
```bash
# Generate Prisma Client to src/generated/prisma
pnpm generate

# Run database migration in development
pnpm migrate

# Open Prisma Studio to inspect records
pnpm studio
```

## 3. Atomic Updates & Concurrency Control (Double-Booking Prevention)
When booking a doctor schedule slot, never do an un-isolated check followed by an update. Always use atomic condition updates within a transaction:

```typescript
// Atomically claims a schedule slot; if count is 0, another user already booked it.
const reserveSlot = async (tx: Prisma.TransactionClient, doctorId: string, scheduleId: string) => {
    const reserved = await tx.doctorSchedules.updateMany({
        where: { doctorId, scheduleId, isBooked: false },
        data: { isBooked: true },
    });

    if (reserved.count === 0) {
        throw new AppError(status.CONFLICT, "This schedule slot is already booked");
    }
};
```

## 4. Multi-Table Transactions
Always use `prisma.$transaction` for operations that alter multiple records or require rollbacks:
- Creating appointments + payment records + updating schedule slots.
- Creating doctor profiles + user records + specialty associations.
- Cron cleanup operations (canceling appointment status + marking payment canceled + freeing doctor schedules).

## 5. Aggregations & Rating Calculation
When updating review ratings for doctors, aggregate atomically:
```typescript
const result = await tx.review.aggregate({
    where: { doctorId },
    _avg: { rating: true },
});

await tx.doctor.update({
    where: { id: doctorId },
    data: { averageRating: Number((result._avg.rating ?? 0).toFixed(1)) },
});
```
