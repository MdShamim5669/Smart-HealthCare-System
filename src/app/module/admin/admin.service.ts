import status from "http-status";
import { UserStatus } from "../../../generated/prisma";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IUpdateAdminPayload } from "./admin.interface";

const getAllAdmins = async (query: Record<string, any> = {}) => {
    return await new QueryBuilder(prisma.admin, query)
        .where({ isDeleted: false })
        .search(["name", "email", "contactNumber"])
        .sort("createdAt", "desc")
        .paginate()
        .include({
            user: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                },
            },
        })
        .execute();
};


const getAdminById = async (id: string) => {
    const admin = await prisma.admin.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                },
            },
        },
    });

    if (!admin || admin.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Admin not found");
    }

    return admin;
};

const updateAdmin = async (id: string, payload: IUpdateAdminPayload) => {
    const admin = await prisma.admin.findUnique({
        where: { id },
    });

    if (!admin || admin.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Admin not found");
    }

    return await prisma.admin.update({
        where: { id },
        data: payload,
    });
};

const deleteAdmin = async (id: string) => {
    const admin = await prisma.admin.findUnique({
        where: { id },
    });

    if (!admin || admin.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Admin not found");
    }

    return await prisma.$transaction(async (tx) => {
        const deletedAdmin = await tx.admin.update({
            where: { id },
            data: { isDeleted: true },
        });

        await tx.user.update({
            where: { email: admin.email },
            data: { isDeleted: true, status: UserStatus.DELETED },
        });

        return deletedAdmin;
    });
};

export const AdminService = {
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
};
