import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PrescriptionService } from "./prescription.service";

const createPrescription = catchAsync(async (req: Request, res: Response) => {
    const result = await PrescriptionService.createPrescription(req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Prescription created successfully",
        data: result,
    });
});

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
    const result = await PrescriptionService.getMyPrescriptions(req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Prescriptions retrieved successfully",
        data: result,
    });
});

const getAllPrescriptions = catchAsync(async (req: Request, res: Response) => {
    const result = await PrescriptionService.getAllPrescriptions();
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "All prescriptions retrieved successfully",
        data: result,
    });
});

const getPrescriptionById = catchAsync(async (req: Request, res: Response) => {
    const result = await PrescriptionService.getPrescriptionById(req.params.id as string, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Prescription retrieved successfully",
        data: result,
    });
});

const updatePrescription = catchAsync(async (req: Request, res: Response) => {
    const result = await PrescriptionService.updatePrescription(req.params.id as string, req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Prescription updated successfully",
        data: result,
    });
});

export const PrescriptionController = {
    createPrescription,
    getMyPrescriptions,
    getAllPrescriptions,
    getPrescriptionById,
    updatePrescription,
};
