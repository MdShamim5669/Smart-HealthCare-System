import z from "zod";
import { Gender } from "../../../generated/prisma";

const updateDoctorZodSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    contactNumber: z.string().optional(),
    address: z.string().optional(),
    registrationNumber: z.string().optional(),
    experience: z.number().int().min(0).optional(),
    gender: z.enum([Gender.MALE, Gender.FEMALE]).optional(),
    apointmentFee: z.number().min(0).optional(),
    qualification: z.string().optional(),
    currentWorkingPlace: z.string().optional(),
    designation: z.string().optional(),
    profilePhoto: z.string().url("Profile photo must be a valid URL").optional(),
    specialties: z.array(z.string().uuid("Specialty id must be a valid UUID")).optional(),
});

export const DoctorValidation = {
    updateDoctorZodSchema,
};
