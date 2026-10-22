import { Request, Response } from "express";
import status from "http-status";
import config from "../../config";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CookieUtils } from "../../utils/cookie";
import { AuthService } from "./auth.service";

const cookieOptions = {
    secure: config.env === "production",
    httpOnly: true,
    sameSite: config.env === "production" ? ("none" as const) : ("lax" as const),
};

const register = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.CREATED,
        message: result.message,
        data: null,
    });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.verifyEmail(req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: result.message,
        data: null,
    });
});

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);

    res.cookie("better-auth.session_token", result.sessionToken, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie("accessToken", result.accessToken, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie("refreshToken", result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "User logged in successfully",
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.getMe(req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "User profile retrieved successfully",
        data: result,
    });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const incomingRefreshToken = CookieUtils.getCookie(req, "refreshToken") || req.body.refreshToken;
    const incomingSessionToken = CookieUtils.getCookie(req, "better-auth.session_token");

    if (!incomingRefreshToken) {
        throw new AppError(status.UNAUTHORIZED, "Refresh token is missing from cookies");
    }

    const result = await AuthService.refreshToken(incomingRefreshToken, incomingSessionToken);

    res.cookie("accessToken", result.accessToken, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Access token refreshed successfully",
        data: {
            accessToken: result.accessToken,
        },
    });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.changePassword(req.body, req.user as IRequestUser);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: result.message,
        data: null,
    });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.forgetPassword(req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: result.message,
        data: null,
    });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.resetPassword(req.body);
    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: result.message,
        data: null,
    });
});

const logout = catchAsync(async (req: Request, res: Response) => {
    const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");
    await AuthService.logout(sessionToken);

    res.clearCookie("better-auth.session_token", cookieOptions);
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    sendResponse(res, {
        success: true,
        httpStatusCode: status.OK,
        message: "Logged out successfully",
        data: null,
    });
});

export const AuthController = {
    register,
    verifyEmail,
    login,
    getMe,
    refreshToken,
    changePassword,
    forgetPassword,
    resetPassword,
    logout,
};
