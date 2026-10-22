import z from "zod";

const createDoctorScheduleZodSchema = z.object({
    scheduleIds: z.array(z.string().uuid("Each scheduleId must be a valid UUID")),
});

export const DoctorScheduleValidation = {
    createDoctorScheduleZodSchema,
};
