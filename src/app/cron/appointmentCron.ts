import cron, { ScheduledTask } from "node-cron";
import { PaymentService } from "../module/payment/payment.service";

let appointmentCronTask: ScheduledTask | null = null;

/**
 * Execute auto-cancellation logic once
 */
export const runAppointmentAutoCancel = async (): Promise<{ canceledCount: number }> => {
    try {
        const timestamp = new Date().toISOString();
        console.log(`[Cron: ${timestamp}] Checking for unpaid appointments older than 30 minutes...`);
        const result = await PaymentService.autoCancelUnpaidAppointments();
        if (result.canceledCount > 0) {
            console.log(
                `[Cron: ${timestamp}] Successfully auto-canceled ${result.canceledCount} unpaid expired appointment(s) and released slot(s).`
            );
        } else {
            console.log(`[Cron: ${timestamp}] No unpaid expired appointments found.`);
        }
        return result;
    } catch (error) {
        console.error(`[Cron Error: ${new Date().toISOString()}] Failed to execute auto-cancellation:`, error);
        throw error;
    }
};

/**
 * Initialize 25-minute periodic cron job
 */
export const initAppointmentCron = (): void => {
    if (appointmentCronTask) {
        console.log("[Cron] Appointment auto-cancellation cron is already active.");
        return;
    }

    // Runs every 25 minutes (*/25 * * * *)
    appointmentCronTask = cron.schedule("*/25 * * * *", async () => {
        try {
            await runAppointmentAutoCancel();
        } catch (err) {
            // Error is handled and logged inside runAppointmentAutoCancel
        }
    });

    console.log("[Cron] Appointment auto-cancellation scheduled (every 25 minutes: */25 * * * *).");
};

/**
 * Gracefully stop the cron job
 */
export const stopAppointmentCron = (): void => {
    if (appointmentCronTask) {
        appointmentCronTask.stop();
        appointmentCronTask = null;
        console.log("[Cron] Appointment auto-cancellation cron stopped.");
    }
};
