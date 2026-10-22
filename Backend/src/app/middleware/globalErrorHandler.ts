import { ErrorRequestHandler } from "express";
import status from "http-status";
import { ZodError } from "zod";
import config from "../config";
import AppError from "../errorHelpers/AppError";

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message = "Something went wrong!";
    let errorSources: Array<{ path: string | number; message: string }> = [];

    if (err instanceof ZodError) {
        statusCode = status.BAD_REQUEST;
        message = "Validation Error";
        errorSources = err.issues.map((issue) => ({
            path: String(issue.path[issue.path.length - 1] ?? "unknown"),
            message: issue.message,
        }));
    } else if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errorSources = [
            {
                path: "",
                message: err.message,
            },
        ];
    } else if (err instanceof Error) {
        message = err.message;
        errorSources = [
            {
                path: "",
                message: err.message,
            },
        ];
    }

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errorSources,
        stack: config.env === "development" ? err?.stack : undefined,
    });
};
