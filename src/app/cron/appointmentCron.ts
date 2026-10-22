import cron from "node-cron";
import { PaymentService } from "../module/payment/payment.service";

export const initAppointmentCron = (): void => {
    // Runs every 25 minutes to automatically cancel unpaid appointments older than 30 minutes
    cron.schedule("*/25 * * * *", async () => {
        try {
            console.log("[Cron] Checking for unpaid expired appointments...");
            const result = await PaymentService.autoCancelUnpaidAppointments();
            if (result.canceledCount > 0) {
                console.log(`[Cron] Auto-canceled ${result.canceledCount} unpaid expired appointments.`);
            }
        } catch (error) {
            console.error("[Cron Error] Failed to run unpaid appointments auto-cancellation:", error);
        }
    });
};
