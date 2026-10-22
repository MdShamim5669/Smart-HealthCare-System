import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DoctorScheduleService } from "./doctorSchedule.service";

const createMyDoctorSchedule = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorScheduleService.createMyDoctorSchedule(req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Doctor schedule slots created successfully",
        data: result,
    });
});

const getMyDoctorSchedules = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorScheduleService.getMyDoctorSchedules(req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "My doctor schedules retrieved successfully",
        data: result,
    });
});

const deleteMyDoctorSchedule = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorScheduleService.deleteMyDoctorSchedule(req.params.id as string, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Doctor schedule deleted successfully",
        data: result,
    });
});

const getAllDoctorSchedules = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorScheduleService.getAllDoctorSchedules();
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "All doctor schedules retrieved successfully",
        data: result,
    });
});

export const DoctorScheduleController = {
    createMyDoctorSchedule,
    getMyDoctorSchedules,
    deleteMyDoctorSchedule,
    getAllDoctorSchedules,
};
