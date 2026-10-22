import { Request, Response } from "express";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.createReview(req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: "Review created successfully",
        data: result,
    });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.getMyReviews(req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Reviews retrieved successfully",
        data: result,
    });
});

const getDoctorReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.getDoctorReviews(req.params.doctorId as string);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Doctor reviews retrieved successfully",
        data: result,
    });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.getAllReviews();
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "All reviews retrieved successfully",
        data: result,
    });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.updateReview(req.params.id as string, req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Review updated successfully",
        data: result,
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.deleteReview(req.params.id as string, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Review deleted successfully",
        data: result,
    });
});

export const ReviewController = {
    createReview,
    getMyReviews,
    getDoctorReviews,
    getAllReviews,
    updateReview,
    deleteReview,
};
