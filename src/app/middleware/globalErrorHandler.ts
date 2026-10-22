import { ErrorRequestHandler } from "express";
import status from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma";
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
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            statusCode = status.CONFLICT;
            const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "field";
            message = `Duplicate resource error: A record with this ${target} already exists.`;
            errorSources = [
                {
                    path: target,
                    message,
                },
            ];
        } else if (err.code === "P2025") {
            statusCode = status.NOT_FOUND;
            message = (err.meta?.cause as string) || "Record not found";
            errorSources = [
                {
                    path: "",
                    message,
                },
            ];
        } else if (err.code === "P2003") {
            statusCode = status.BAD_REQUEST;
            message = "Foreign key constraint failed on the database relation.";
            errorSources = [
                {
                    path: "",
                    message,
                },
            ];
        } else {
            statusCode = status.BAD_REQUEST;
            message = err.message;
            errorSources = [
                {
                    path: "",
                    message: err.message,
                },
            ];
        }
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = status.BAD_REQUEST;
        message = "Database schema query validation error.";
        errorSources = [
            {
                path: "",
                message: err.message,
            },
        ];
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

