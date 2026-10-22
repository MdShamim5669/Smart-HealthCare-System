import z from "zod";

const createPrescriptionZodSchema = z.object({
    appointmentId: z.string().uuid("Appointment id must be a valid id"),
    followUpDate: z.coerce
        .date({ message: "Follow-up date must be a valid date" })
        .refine((date) => date.getTime() > Date.now(), "Follow-up date must be in the future"),
    instructions: z
        .string({ message: "Instructions are required" })
        .min(5, "Instructions must be at least 5 characters")
        .max(2000, "Instructions must be at most 2000 characters"),
});

const updatePrescriptionZodSchema = z
    .object({
        followUpDate: z.coerce
            .date({ message: "Follow-up date must be a valid date" })
            .refine((date) => date.getTime() > Date.now(), "Follow-up date must be in the future")
            .optional(),
        instructions: z
            .string()
            .min(5, "Instructions must be at least 5 characters")
            .max(2000, "Instructions must be at most 2000 characters")
            .optional(),
    })
    .refine((data) => data.followUpDate !== undefined || data.instructions !== undefined, {
        message: "Provide followUpDate or instructions to update",
    });

export const PrescriptionValidation = {
    createPrescriptionZodSchema,
    updatePrescriptionZodSchema,
};
