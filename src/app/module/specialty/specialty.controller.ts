import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SpecialtyService } from "./specialty.service";

const createSpecialty = catchAsync(async (req: Request, res: Response) => {
    const result = await SpecialtyService.createSpecialty(req.body, req.file);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Specialty created successfully",
        data: result,
    });
});

const getAllSpecialties = catchAsync(async (req: Request, res: Response) => {
    const result = await SpecialtyService.getAllSpecialties();
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Specialties retrieved successfully",
        data: result,
    });
});

const deleteSpecialty = catchAsync(async (req: Request, res: Response) => {
    const result = await SpecialtyService.deleteSpecialty(req.params.id as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Specialty deleted successfully",
        data: result,
    });
});

export const SpecialtyController = {
    createSpecialty,
    getAllSpecialties,
    deleteSpecialty,
};
