import { z } from "zod";
import { PaymentStatus } from "../../../generated/prisma";

export const initiatePaymentZodSchema = z.object({
    appointmentId: z.string({ message: "Appointment ID is required" }),
});

export const updatePaymentStatusZodSchema = z.object({
    status: z.enum([PaymentStatus.PAID, PaymentStatus.UNPAID], {
        message: "Status must be either PAID or UNPAID",
    }),
});

export const PaymentValidation = {
    initiatePaymentZodSchema,
    updatePaymentStatusZodSchema,
};
