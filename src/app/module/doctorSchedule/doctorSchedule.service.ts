import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreateDoctorSchedulePayload } from "./doctorSchedule.interface";

const createMyDoctorSchedule = async (payload: ICreateDoctorSchedulePayload, user: IRequestUser) => {
    const doctorData = await prisma.doctor.findUnique({
        where: { email: user.email },
    });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
    }

    const doctorScheduleData = payload.scheduleIds.map((scheduleId) => ({
        doctorId: doctorData.id,
        scheduleId,
    }));

    return await prisma.doctorSchedules.createMany({
        data: doctorScheduleData,
        skipDuplicates: true,
    });
};

const getMyDoctorSchedules = async (user: IRequestUser) => {
    const doctorData = await prisma.doctor.findUnique({
        where: { email: user.email },
    });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
    }

    return await prisma.doctorSchedules.findMany({
        where: { doctorId: doctorData.id },
        include: {
            schedule: true,
        },
        orderBy: { schedule: { startDate: "asc" } },
    });
};

const deleteMyDoctorSchedule = async (scheduleId: string, user: IRequestUser) => {
    const doctorData = await prisma.doctor.findUnique({
        where: { email: user.email },
    });

    if (!doctorData) {
        throw new AppError(status.NOT_FOUND, "Doctor profile not found");
    }

    const doctorSchedule = await prisma.doctorSchedules.findUnique({
        where: {
            doctorId_scheduleId: {
                doctorId: doctorData.id,
                scheduleId,
            },
        },
    });

    if (!doctorSchedule) {
        throw new AppError(status.NOT_FOUND, "Doctor schedule not found");
    }

    if (doctorSchedule.isBooked) {
        throw new AppError(status.BAD_REQUEST, "You cannot delete a booked schedule slot");
    }

    return await prisma.doctorSchedules.delete({
        where: {
            doctorId_scheduleId: {
                doctorId: doctorData.id,
                scheduleId,
            },
        },
    });
};

const getAllDoctorSchedules = async () => {
    return await prisma.doctorSchedules.findMany({
        include: {
            doctor: { select: { id: true, name: true, email: true, designation: true } },
            schedule: true,
        },
        orderBy: { schedule: { startDate: "asc" } },
    });
};

export const DoctorScheduleService = {
    createMyDoctorSchedule,
    getMyDoctorSchedules,
    deleteMyDoctorSchedule,
    getAllDoctorSchedules,
};
