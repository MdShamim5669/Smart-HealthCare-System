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
            const bearerToken = req.headers.authorization?.startsWith("Bearer ")
                ? req.headers.authorization.split(" ")[1]
                : undefined;

            const sessionCookieToken = CookieUtils.getCookie(req, "better-auth.session_token");
            const headerSessionToken = req.headers["x-session-token"] as string | undefined;
            const accessCookieToken = CookieUtils.getCookie(req, "accessToken");

            // A JWT token typically has 3 parts separated by dots
            const isJwt = (t?: string) => !!t && t.split(".").length === 3;

            let authenticatedUser: { id: string; role: Role; email: string; status: UserStatus; isDeleted: boolean } | null = null;
            let sessionData: { expiresAt: Date; createdAt: Date } | null = null;

            // Strategy 1: Check Session Token (from cookie, custom header, or non-JWT bearer)
            const sessionToken = sessionCookieToken || headerSessionToken || (!isJwt(bearerToken) ? bearerToken : undefined);

            if (sessionToken) {
                const sessionRecord = await prisma.session.findFirst({
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

                if (sessionRecord && sessionRecord.user) {
                    authenticatedUser = sessionRecord.user;
                    sessionData = {
                        expiresAt: new Date(sessionRecord.expiresAt),
                        createdAt: new Date(sessionRecord.createdAt),
                    };
                }
            }

            // Strategy 2: If no session found or using JWT Bearer/Cookie, try JWT access token
            if (!authenticatedUser) {
                const jwtToken = (isJwt(bearerToken) ? bearerToken : undefined) || accessCookieToken;

                if (jwtToken) {
                    try {
                        const verifiedPayload = JwtUtils.verifyToken(jwtToken, config.jwt.access_token_secret);
                        if (verifiedPayload && verifiedPayload.userId) {
                            const dbUser = await prisma.user.findUnique({
                                where: { id: verifiedPayload.userId },
                            });
                            if (dbUser) {
                                authenticatedUser = dbUser;
                            }
                        }
                    } catch (jwtErr) {
                        // Invalid or expired JWT
                    }
                }
            }

            // If neither session nor JWT validated, throw 401
            if (!authenticatedUser) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! Please login to continue.");
            }

            // Check Session Refresh Header logic when session is used
            if (sessionData) {
                const now = new Date();
                const sessionLifeTime = sessionData.expiresAt.getTime() - sessionData.createdAt.getTime();
                const timeRemaining = sessionData.expiresAt.getTime() - now.getTime();
                const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

                if (percentRemaining < 20) {
                    res.setHeader("X-Session-Refresh", "true");
                    res.setHeader("X-Session-Expires-At", sessionData.expiresAt.toISOString());
                    res.setHeader("X-Time-Remaining", timeRemaining.toString());
                }
            }

            // User status validation
            if (authenticatedUser.status === UserStatus.BLOCKED || authenticatedUser.status === UserStatus.DELETED) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! Your account is blocked or deactivated.");
            }

            if (authenticatedUser.isDeleted) {
                throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User account has been deleted.");
            }

            // Role-based Access Control (RBAC)
            if (authRoles.length > 0 && !authRoles.includes(authenticatedUser.role)) {
                throw new AppError(status.FORBIDDEN, "Forbidden access! You do not have permission to access this resource.");
            }

            req.user = {
                userId: authenticatedUser.id,
                role: authenticatedUser.role,
                email: authenticatedUser.email,
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};
