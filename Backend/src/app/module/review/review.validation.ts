import z from "zod";

const createReviewZodSchema = z.object({
    appointmentId: z.string().uuid("Appointment id must be a valid id"),
    rating: z
        .number({ message: "Rating is required" })
        .min(1, "Rating must be at least 1")
        .max(5, "Rating must be at most 5"),
    comment: z.string().max(500, "Comment must be at most 500 characters").optional(),
});

const updateReviewZodSchema = z
    .object({
        rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5").optional(),
        comment: z.string().max(500, "Comment must be at most 500 characters").optional(),
    })
    .refine((data) => data.rating !== undefined || data.comment !== undefined, {
        message: "Provide rating or comment to update",
    });

export const ReviewValidation = {
    createReviewZodSchema,
    updateReviewZodSchema,
};
