import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AdminService } from "./admin.service";

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAllAdmins(req.query);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Admins retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
});


const getAdminById = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAdminById(req.params.id as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Admin retrieved successfully",
        data: result,
    });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.updateAdmin(req.params.id as string, req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Admin updated successfully",
        data: result,
    });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.deleteAdmin(req.params.id as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Admin deleted successfully",
        data: result,
    });
});

export const AdminController = {
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
};
