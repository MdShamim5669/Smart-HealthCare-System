import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { Role, UserStatus } from "../../generated/prisma";
import config from "../config";
import AppError from "../errorHelpers/AppError";
import { prisma } from "../lib/prisma";
import { CookieUtils } from "../utils/cookie";
import { JwtUtils } from "../utils/jwt";

export const checkAuth = (...authRoles: Role[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");

            if (!sessionToken) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! No session token provided.");
            }

            const sessionExists = await prisma.session.findFirst({
                where: {
                    token: sessionToken,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
                include: {
                    user: true,
                },
            });

            if (!sessionExists || !sessionExists.user) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! Session is invalid or expired.");
            }

            const user = sessionExists.user;

            const now = new Date();
            const expiresAt = new Date(sessionExists.expiresAt);
            const createdAt = new Date(sessionExists.createdAt);

            const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
            const timeRemaining = expiresAt.getTime() - now.getTime();
            const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

            if (percentRemaining < 20) {
                res.setHeader("X-Session-Refresh", "true");
                res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
                res.setHeader("X-Time-Remaining", timeRemaining.toString());
            }

            if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User is not active.");
            }

            if (user.isDeleted) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User is deleted.");
            }

            if (authRoles.length > 0 && !authRoles.includes(user.role)) {
                throw new AppError(status.FORBIDDEN, "Forbidden access! You do not have permission to access this resource.");
            }

            req.user = {
                userId: user.id,
                role: user.role,
                email: user.email,
            };

            // Access Token JWT Verification if provided
            const accessToken = CookieUtils.getCookie(req, "accessToken") || req.headers.authorization?.split(" ")[1];

            if (accessToken) {
                try {
                    const verifiedToken = JwtUtils.verifyToken(accessToken, config.jwt.access_token_secret);
                    if (verifiedToken && authRoles.length > 0 && !authRoles.includes(verifiedToken.role as Role)) {
                        throw new AppError(status.FORBIDDEN, "Forbidden access! Token role is unauthorized.");
                    }
                } catch (jwtErr) {
                    // If session is valid, accessToken expiration can trigger refresh via header
                }
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
