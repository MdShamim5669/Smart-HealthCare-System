import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    const result = await PaymentService.handleStripeWebhook(req.body, signature);
    res.status(status.OK).json(result);
});

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
    const { appointmentId, gateway } = req.body;
    const result = await PaymentService.initiatePayment(appointmentId, req.user as IRequestUser, gateway);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Payment checkout session initiated successfully",
        data: result,
    });
});

const handleSslCommerzSuccess = catchAsync(async (req: Request, res: Response) => {
    const appointmentId = req.query.appointmentId as string;
    const result = await PaymentService.handleSslCommerzSuccess(req.body, appointmentId);
    res.redirect(result.redirectUrl);
});

const handleSslCommerzFail = catchAsync(async (req: Request, res: Response) => {
    const appointmentId = req.query.appointmentId as string;
    const result = await PaymentService.handleSslCommerzFail(req.body, appointmentId);
    res.redirect(result.redirectUrl);
});

const handleSslCommerzCancel = catchAsync(async (req: Request, res: Response) => {
    const appointmentId = req.query.appointmentId as string;
    const result = await PaymentService.handleSslCommerzCancel(req.body, appointmentId);
    res.redirect(result.redirectUrl);
});

const handleSslCommerzIpn = catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentService.handleSslCommerzIpn(req.body);
    res.status(status.OK).json(result);
});


const getPaymentById = catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentService.getPaymentById(req.params.id as string, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Payment retrieved successfully",
        data: result,
    });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentService.getMyPayments(req.user as IRequestUser, req.query);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "My payments retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentService.getAllPayments(req.query);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "All payments retrieved successfully",
        meta: result.meta,
        data: result.data,
    });
});

const runAutoCancel = catchAsync(async (req: Request, res: Response) => {
    const result = await PaymentService.autoCancelUnpaidAppointments();
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Unpaid expired appointments auto-canceled successfully",
        data: result,
    });
});

export const PaymentController = {
    handleStripeWebhook,
    initiatePayment,
    handleSslCommerzSuccess,
    handleSslCommerzFail,
    handleSslCommerzCancel,
    handleSslCommerzIpn,
    getPaymentById,
    getMyPayments,
    getAllPayments,
    runAutoCancel,
};

