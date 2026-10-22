import z from "zod";

const updateAdminZodSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    contactNumber: z.string().optional(),
    profilePhoto: z.string().url("Profile photo must be a valid URL").optional(),
});

export const AdminValidation = {
    updateAdminZodSchema,
};
