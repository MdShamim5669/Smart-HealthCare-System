import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DoctorService } from "./doctor.service";

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
    const filters = {
        searchTerm: req.query.searchTerm as string,
        email: req.query.email as string,
        contactNumber: req.query.contactNumber as string,
        gender: req.query.gender as any,
        specialties: req.query.specialties as string,
    };
    const options = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
    };

    const result = await DoctorService.getAllDoctors(filters, options);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Doctors retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
});

const getDoctorById = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorService.getDoctorById(req.params.id as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Doctor retrieved successfully",
        data: result,
    });
});

const updateDoctor = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorService.updateDoctor(req.params.id as string, req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Doctor updated successfully",
        data: result,
    });
});

const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
    const result = await DoctorService.deleteDoctor(req.params.id as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Doctor deleted successfully",
        data: result,
    });
});

export const DoctorController = {
    getAllDoctors,
    getDoctorById,
    updateDoctor,
    deleteDoctor,
};
