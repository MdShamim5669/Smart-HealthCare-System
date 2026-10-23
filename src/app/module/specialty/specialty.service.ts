import status from "http-status";
import { CLOUDINARY_FOLDER, uploadToCloudinary } from "../../config/cloudinary";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateSpecialtyPayload } from "./specialty.interface";

const createSpecialty = async (payload: ICreateSpecialtyPayload, file?: Express.Multer.File) => {
    const existing = await prisma.specialty.findUnique({
        where: { title: payload.title },
    });

    if (existing && !existing.isDeleted) {
        throw new AppError(status.CONFLICT, "Specialty with this title already exists");
    }

    let iconUrl = "https://placehold.co/100x100?text=Specialty";

    if (file) {
        const uploadResult = await uploadToCloudinary(file, {
            folder: CLOUDINARY_FOLDER.SPECIALTY,
        });
        iconUrl = uploadResult.secure_url;
    }

    if (existing && existing.isDeleted) {
        return await prisma.specialty.update({
            where: { id: existing.id },
            data: { isDeleted: false, icon: iconUrl },
        });
    }

    return await prisma.specialty.create({
        data: {
            title: payload.title,
            icon: iconUrl,
        },
    });
};

const getAllSpecialties = async () => {
    return await prisma.specialty.findMany({
        where: { isDeleted: false },
        orderBy: { title: "asc" },
    });
};

const deleteSpecialty = async (id: string) => {
    const specialty = await prisma.specialty.findUnique({
        where: { id },
    });

    if (!specialty || specialty.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Specialty not found");
    }

    return await prisma.specialty.update({
        where: { id },
        data: { isDeleted: true },
    });
};

export const SpecialtyService = {
    createSpecialty,
    getAllSpecialties,
    deleteSpecialty,
};
