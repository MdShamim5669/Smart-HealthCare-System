import z from "zod";
import { AppointmentStatus } from "../../../generated/prisma";

const bookAppointmentZodSchema = z.object({
    doctorId: z.string().uuid("Doctor id must be a valid id"),
    scheduleId: z.string().uuid("Schedule id must be a valid id"),
    gateway: z.enum(["STRIPE", "SSLCOMMERZ"]).optional(),
});


const changeAppointmentStatusZodSchema = z.object({
    status: z.enum([
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.INPROGRESS,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELED,
    ]),
});

export const AppointmentValidation = {
    bookAppointmentZodSchema,
    changeAppointmentStatusZodSchema,
};
