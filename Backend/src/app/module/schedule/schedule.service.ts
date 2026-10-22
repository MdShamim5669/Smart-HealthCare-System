import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateSchedulePayload, IScheduleFilterRequest } from "./schedule.interface";

const createSchedule = async (payload: ICreateSchedulePayload) => {
    const { startDate, endDate, startTime, endTime } = payload;

    const intervalTime = 30; // 30 minutes
    const schedules: { startDate: Date; endDate: Date }[] = [];

    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    while (currentDate <= lastDate) {
        const startDateTime = new Date(
            addTime(currentDate, startTime)
        );

        const endDateTime = new Date(
            addTime(currentDate, endTime)
        );

        while (startDateTime < endDateTime) {
            const slotStart = new Date(startDateTime);
            const slotEnd = new Date(startDateTime.getTime() + intervalTime * 60000);

            const existingSchedule = await prisma.schedule.findFirst({
                where: {
                    startDate: slotStart,
                    endDate: slotEnd,
                },
            });

            if (!existingSchedule) {
                schedules.push({
                    startDate: slotStart,
                    endDate: slotEnd,
                });
            }

            startDateTime.setMinutes(startDateTime.getMinutes() + intervalTime);
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (schedules.length === 0) {
        throw new AppError(status.CONFLICT, "No new slots were generated (all selected slots already exist).");
    }

    await prisma.schedule.createMany({
        data: schedules,
    });

    return schedules;
};

const addTime = (baseDate: Date, timeStr: string): string => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
};

const getAllSchedules = async (filters: IScheduleFilterRequest) => {
    const where: any = {};

    if (filters.startDate && filters.endDate) {
        where.AND = [
            { startDate: { gte: new Date(filters.startDate) } },
            { endDate: { lte: new Date(filters.endDate) } },
        ];
    }

    return await prisma.schedule.findMany({
        where,
        orderBy: { startDate: "asc" },
    });
};

const getScheduleById = async (id: string) => {
    const schedule = await prisma.schedule.findUnique({
        where: { id },
    });

    if (!schedule) {
        throw new AppError(status.NOT_FOUND, "Schedule slot not found");
    }

    return schedule;
};

const deleteSchedule = async (id: string) => {
    const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: { doctorSchedules: true },
    });

    if (!schedule) {
        throw new AppError(status.NOT_FOUND, "Schedule slot not found");
    }

    if (schedule.doctorSchedules && schedule.doctorSchedules.length > 0) {
        throw new AppError(status.BAD_REQUEST, "Cannot delete schedule as it is already assigned to a doctor");
    }

    return await prisma.schedule.delete({
        where: { id },
    });
};

export const ScheduleService = {
    createSchedule,
    getAllSchedules,
    getScheduleById,
    deleteSchedule,
};
