import status from "http-status";
import { Role } from "../../../generated/prisma";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { PasswordUtils } from "../../utils/password";
import { ICreateAdminPayload, ICreateDoctorPayload } from "./user.interface";

const createDoctor = async (payload: ICreateDoctorPayload) => {
    const userExists = await prisma.user.findUnique({
        where: { email: payload.doctor.email },
    });

    if (userExists) {
        throw new AppError(status.CONFLICT, "User with this email already exists");
    }

    const initialPassword = payload.password || "Doctor123!@#";
    const hashedPassword = PasswordUtils.hashPassword(initialPassword);

    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: payload.doctor.email,
                name: payload.doctor.name,
                role: Role.DOCTOR,
                needPasswordChange: true,
                emailVerified: true,
            },
        });

        await tx.account.create({
            data: {
                userId: user.id,
                accountId: user.id,
                providerId: "credential",
                password: hashedPassword,
            },
        });

        const doctor = await tx.doctor.create({
            data: {
                name: payload.doctor.name,
                email: payload.doctor.email,
                contactNumber: payload.doctor.contactNumber,
                address: payload.doctor.address,
                registrationNumber: payload.doctor.registrationNumber,
                experience: payload.doctor.experience ?? 0,
                gender: payload.doctor.gender,
                apointmentFee: payload.doctor.apointmentFee,
                qualification: payload.doctor.qualification,
                currentWorkingPlace: payload.doctor.currentWorkingPlace,
                designation: payload.doctor.designation,
            },
        });

        if (payload.doctor.specialties && payload.doctor.specialties.length > 0) {
            for (const specialtyId of payload.doctor.specialties) {
                await tx.doctorSpecialty.create({
                    data: {
                        doctorId: doctor.id,
                        specialtiesId: specialtyId,
                    },
                });
            }
        }

        return doctor;
    });

    return result;
};

const createAdmin = async (payload: ICreateAdminPayload) => {
    // Access is restricted to SUPER_ADMIN in user.route.ts and role is validated by createAdminZodSchema
    const userExists = await prisma.user.findUnique({
        where: { email: payload.admin.email },
    });

    if (userExists) {
        throw new AppError(status.CONFLICT, "User with this email already exists");
    }

    const assignedRole = payload.role ?? Role.ADMIN;
    const initialPassword = payload.password || "Admin123!@#";
    const hashedPassword = PasswordUtils.hashPassword(initialPassword);

    const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: payload.admin.email,
                name: payload.admin.name,
                role: assignedRole,
                needPasswordChange: true,
                emailVerified: true,
            },
        });

        await tx.account.create({
            data: {
                userId: user.id,
                accountId: user.id,
                providerId: "credential",
                password: hashedPassword,
            },
        });

        const admin = await tx.admin.create({
            data: {
                name: payload.admin.name,
                email: payload.admin.email,
                contactNumber: payload.admin.contactNumber,
            },
        });

        return admin;
    });

    return result;
};

export const UserService = {
    createDoctor,
    createAdmin,
};
