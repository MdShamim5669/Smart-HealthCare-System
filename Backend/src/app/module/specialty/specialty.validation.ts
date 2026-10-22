import z from "zod";

const createSpecialtyZodSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters").max(100, "Title must be at most 100 characters"),
});

export const SpecialtyValidation = {
    createSpecialtyZodSchema,
};
