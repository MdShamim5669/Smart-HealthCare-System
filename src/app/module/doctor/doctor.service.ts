import status from "http-status";
import { Role, UserStatus } from "../../../generated/prisma";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IDoctorFilterRequest, IUpdateDoctorPayload } from "./doctor.interface";

const doctorInclude = {
    doctorSpecialties: {
        include: {
            specialties: true,
        },
    },
};

const getAllDoctors = async (filters: IDoctorFilterRequest, options: { page?: number; limit?: number }) => {
    const queryBuilder = new QueryBuilder(prisma.doctor, { ...filters, ...options })
        .where({ isDeleted: false })
        .search(["name", "email", "qualification", "designation"])
        .sort("createdAt", "desc")
        .paginate()
        .include(doctorInclude);

    if (filters.gender) {
        queryBuilder.where({ gender: filters.gender });
    }

    if (filters.specialties) {
        queryBuilder.where({
            doctorSpecialties: {
                some: {
                    specialties: {
                        title: { contains: filters.specialties, mode: "insensitive" },
                    },
                },
            },
        });
    }

    return await queryBuilder.execute();
};


const getDoctorById = async (id: string) => {
    const doctor = await prisma.doctor.findUnique({
        where: { id },
        include: {
            doctorSpecialties: {
                include: {
                    specialties: true,
                },
            },
            reviews: {
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                    patient: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (!doctor || doctor.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Doctor not found");
    }

    return doctor;
};

const updateDoctor = async (id: string, payload: IUpdateDoctorPayload, user?: IRequestUser) => {
    const doctor = await prisma.doctor.findUnique({
        where: { id },
    });

    if (!doctor || doctor.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Doctor not found");
    }

    if (user && user.role === Role.DOCTOR && doctor.email !== user.email) {
        throw new AppError(status.FORBIDDEN, "Forbidden access! You can only update your own doctor profile.");
    }

    const { specialties, ...doctorData } = payload;

    return await prisma.$transaction(async (tx) => {
        const updatedDoctor = await tx.doctor.update({
            where: { id },
            data: doctorData,
            include: doctorInclude,
        });

        if (specialties && specialties.length > 0) {
            // Delete existing relations and replace with new
            await tx.doctorSpecialty.deleteMany({
                where: { doctorId: id },
            });

            for (const specialtyId of specialties) {
                await tx.doctorSpecialty.create({
                    data: {
                        doctorId: id,
                        specialtiesId: specialtyId,
                    },
                });
            }
        }

        return updatedDoctor;
    });
};

const deleteDoctor = async (id: string) => {
    const doctor = await prisma.doctor.findUnique({
        where: { id },
    });

    if (!doctor || doctor.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Doctor not found");
    }

    return await prisma.$transaction(async (tx) => {
        const deletedDoctor = await tx.doctor.update({
            where: { id },
            data: { isDeleted: true },
        });

        await tx.user.update({
            where: { email: doctor.email },
            data: { isDeleted: true, status: UserStatus.DELETED },
        });

        return deletedDoctor;
    });
};

export const DoctorService = {
    getAllDoctors,
    getDoctorById,
    updateDoctor,
    deleteDoctor,
};
