import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UserService } from "./user.service";

const createDoctor = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.createDoctor(req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Doctor created successfully",
        data: result,
    });
});

const createAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.createAdmin(req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Admin created successfully",
        data: result,
    });
});

export const UserController = {
    createDoctor,
    createAdmin,
};
