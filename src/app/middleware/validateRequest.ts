import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

export const validateRequest = (zodSchema: ZodType) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const parsedResult = zodSchema.safeParse(req.body);

        if (!parsedResult.success) {
            return next(parsedResult.error);
        }

        req.body = parsedResult.data;
        next();
    };
};
