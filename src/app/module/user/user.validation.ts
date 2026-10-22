import z from "zod";
import { Gender, Role } from "../../../generated/prisma";

export const createDoctorZodSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    doctor: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        contactNumber: z.string().optional(),
        address: z.string().optional(),
        registrationNumber: z.string().optional(),
        experience: z.number().int().min(0).optional(),
        gender: z.enum([Gender.MALE, Gender.FEMALE]),
        apointmentFee: z.number().min(0, "Appointment fee cannot be negative"),
        qualification: z.string().optional(),
        currentWorkingPlace: z.string().optional(),
        designation: z.string().optional(),
        specialties: z.array(z.string().uuid("Specialty id must be a valid UUID")).optional(),
    }),
});

export const createAdminZodSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    role: z.enum([Role.ADMIN, Role.SUPER_ADMIN]).optional(),
    admin: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        contactNumber: z.string().optional(),
    }),
});

export const UserValidation = {
    createDoctorZodSchema,
    createAdminZodSchema,
};
