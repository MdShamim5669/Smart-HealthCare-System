import { Request, Response } from "express";
import status from "http-status";

export const notFound = (req: Request, res: Response): void => {
    res.status(status.NOT_FOUND).json({
        success: false,
        statusCode: status.NOT_FOUND,
        message: `API Not Found: ${req.originalUrl}`,
        error: {
            path: req.originalUrl,
            message: "Your requested resource could not be found.",
        },
    });
};
