---
name: stripe-and-cron-workflow
description: Workflow for handling Stripe Checkout, webhook verification, idempotency, and background cron auto-cancellation of unpaid appointments in PH Healthcare Backend.
---

# Stripe Payments & Cron Auto-Cancellation Workflow

Use this skill when implementing or testing payment flows, webhook listeners, or background scheduled tasks.

## 1. Stripe Checkout Flow
- **Currency**: `BDT`
- **Checkout Session**: Triggered either during initial appointment booking (Pay Now) or via `POST /api/v1/appointments/initiate-payment/:id` (Pay Later).
- **Metadata**: Always pass `appointmentId` and `transactionId` in Stripe session metadata to identify the appointment upon webhook fulfillment.

## 2. Webhook Handling (`POST /webhook`)
- **Route Placement**: Located outside `/api/v1` directly on the Express app root (`/webhook`) because it requires raw body parsing (`express.raw({ type: 'application/json' })`) for cryptographic signature verification.
- **Signature Check**: Verify headers using `stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)`.
- **Idempotency**: Prevent processing duplicate events. Check if the payment or appointment is already `PAID` before running fulfillment updates.
- **Event Handling**: On `checkout.session.completed`, update both `Payment` (`status: PAID`) and `Appointment` (`status: SCHEDULED`, payment status updated) inside a transaction.

## 3. Background Cron Job (Auto-Cancel Unpaid Appointments)
- **Schedule**: Runs every 25 minutes (`*/25 * * * *`) via `node-cron`.
- **Target Condition**:
  - `status: AppointmentStatus.SCHEDULED`
  - `paymentStatus: PaymentStatus.UNPAID`
  - `createdAt: { lte: thirtyMinutesAgo }` (older than 30 minutes)
- **Atomic Slot Reclaiming**:
  ```typescript
  await prisma.$transaction(async (tx) => {
      // 1. Update appointment status to CANCELED
      await tx.appointment.updateMany({
          where: { id: { in: appointmentToCancel } },
          data: { status: AppointmentStatus.CANCELED },
      });

      // 2. Delete or cancel payment records
      await tx.payment.deleteMany({
          where: { appointmentId: { in: appointmentToCancel } },
      });

      // 3. Free up doctor schedule slots
      for (const unpaidAppointment of unpaidAppointments) {
          await tx.doctorSchedules.updateMany({
              where: {
                  doctorId: unpaidAppointment.doctorId,
                  scheduleId: unpaidAppointment.scheduleId,
              },
              data: { isBooked: false },
          });
      }
  });
  ```

## 4. Local Development Webhook Testing
Forward events from Stripe CLI to the local webhook endpoint:
```bash
pnpm stripe:webhook
```
