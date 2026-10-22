import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ScheduleService } from "./schedule.service";

const createSchedule = catchAsync(async (req: Request, res: Response) => {
    const result = await ScheduleService.createSchedule(req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Schedule slots created successfully",
        data: result,
    });
});

const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
    const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
    };
    const result = await ScheduleService.getAllSchedules(filters);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Schedules retrieved successfully",
        data: result,
    });
});

const getScheduleById = catchAsync(async (req: Request, res: Response) => {
    const result = await ScheduleService.getScheduleById(req.params.id as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Schedule retrieved successfully",
        data: result,
    });
});

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
    const result = await ScheduleService.deleteSchedule(req.params.id as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Schedule deleted successfully",
        data: result,
    });
});

export const ScheduleController = {
    createSchedule,
    getAllSchedules,
    getScheduleById,
    deleteSchedule,
};
