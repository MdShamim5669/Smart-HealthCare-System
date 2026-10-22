import { NextFunction, Request, Response } from "express";

export const parseBodyData = (req: Request, res: Response, next: NextFunction): void => {
    if (req.body && req.body.data && typeof req.body.data === "string") {
        try {
            req.body = JSON.parse(req.body.data);
        } catch (error) {
            // Keep req.body as is if parsing fails, validation schema will catch invalid payload
        }
    }
    next();
};
