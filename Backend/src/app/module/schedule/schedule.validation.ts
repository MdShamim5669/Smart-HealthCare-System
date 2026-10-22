import z from "zod";

const createScheduleZodSchema = z.object({
    startDate: z.string({ message: "Start date is required" }),
    endDate: z.string({ message: "End date is required" }),
    startTime: z.string({ message: "Start time is required" }),
    endTime: z.string({ message: "End time is required" }),
});

export const ScheduleValidation = {
    createScheduleZodSchema,
};
