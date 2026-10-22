import status from "http-status";
import { Prisma, UserStatus } from "../../../generated/prisma";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IDoctorFilterRequest, IUpdateDoctorPayload } from "./doctor.interface";

const doctorInclude = {
    doctorSpecialties: {
        include: {
            specialties: true,
        },
    },
};

const getAllDoctors = async (filters: IDoctorFilterRequest, options: { page?: number; limit?: number }) => {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;

    const andConditions: Prisma.DoctorWhereInput[] = [{ isDeleted: false }];

    if (filters.searchTerm) {
        andConditions.push({
            OR: [
                { name: { contains: filters.searchTerm, mode: "insensitive" } },
                { email: { contains: filters.searchTerm, mode: "insensitive" } },
                { qualification: { contains: filters.searchTerm, mode: "insensitive" } },
                { designation: { contains: filters.searchTerm, mode: "insensitive" } },
            ],
        });
    }

    if (filters.gender) {
        andConditions.push({ gender: filters.gender });
    }

    if (filters.specialties) {
        andConditions.push({
            doctorSpecialties: {
                some: {
                    specialties: {
                        title: { contains: filters.specialties, mode: "insensitive" },
                    },
                },
            },
        });
    }

    const where: Prisma.DoctorWhereInput = { AND: andConditions };

    const [data, total] = await Promise.all([
        prisma.doctor.findMany({
            where,
            include: doctorInclude,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.doctor.count({ where }),
    ]);

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
        data,
    };
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

const updateDoctor = async (id: string, payload: IUpdateDoctorPayload) => {
    const doctor = await prisma.doctor.findUnique({
        where: { id },
    });

    if (!doctor || doctor.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Doctor not found");
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
