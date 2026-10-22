import { Response } from "express";

interface IResponseData<T> {
    httpStatusCode: number;
    success: boolean;
    message?: string;
    meta?: {
        page: number;
        limit: number;
        total: number;
        totalPage: number;
    };
    data: T;
}

export const sendResponse = <T>(res: Response, data: IResponseData<T>): void => {
    res.status(data.httpStatusCode).json({
        success: data.success,
        statusCode: data.httpStatusCode,
        message: data.message || null,
        meta: data.meta || null,
        data: data.data,
    });
};
