import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AppointmentService } from "./appointment.service";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
    const result = await AppointmentService.bookAppointment(req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Appointment booked successfully",
        data: result,
    });
});

const bookAppointmentWithPayLater = catchAsync(async (req: Request, res: Response) => {
    const result = await AppointmentService.bookAppointmentWithPayLater(req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Appointment booked with Pay Later successfully",
        data: result,
    });
});

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
    const result = await AppointmentService.initiatePayment(req.params.id as string, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Payment initiated successfully",
        data: result,
    });
});

const changeAppointmentStatus = catchAsync(async (req: Request, res: Response) => {
    const appointmentId = req.params.id as string;
    const { status: newStatus } = req.body;
    const user = req.user as IRequestUser;

    const updatedAppointment = await AppointmentService.changeAppointmentStatus(appointmentId, newStatus, user);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Appointment status updated successfully",
        data: updatedAppointment,
    });
});

const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
    const result = await AppointmentService.getMyAppointments(req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "My appointments retrieved successfully",
        data: result,
    });
});

const getMySingleAppointment = catchAsync(async (req: Request, res: Response) => {
    const result = await AppointmentService.getMySingleAppointment(req.params.id as string, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Appointment retrieved successfully",
        data: result,
    });
});

const getAllAppointments = catchAsync(async (req: Request, res: Response) => {
    const result = await AppointmentService.getAllAppointments();
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "All appointments retrieved successfully",
        data: result,
    });
});

export const AppointmentController = {
    bookAppointment,
    bookAppointmentWithPayLater,
    initiatePayment,
    changeAppointmentStatus,
    getMyAppointments,
    getMySingleAppointment,
    getAllAppointments,
};
