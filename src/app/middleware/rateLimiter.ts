import { NextFunction, Request, Response } from "express";
import status from "http-status";
import AppError from "../errorHelpers/AppError";

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale memory store records every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
        if (now > record.resetTime) {
            memoryStore.delete(key);
        }
    }
}, 10 * 60 * 1000).unref();

export const rateLimiter = (options: {
    windowMs: number;
    max: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
}) => {
    const { windowMs, max, message = "Too many requests. Please try again later.", keyGenerator } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
        const ip =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
            req.socket.remoteAddress ||
            "unknown-ip";

        const identifier = keyGenerator ? keyGenerator(req) : `${ip}:${req.baseUrl}${req.path}`;
        const now = Date.now();
        const record = memoryStore.get(identifier);

        if (!record || now > record.resetTime) {
            memoryStore.set(identifier, {
                count: 1,
                resetTime: now + windowMs,
            });
            return next();
        }

        record.count += 1;

        if (record.count > max) {
            const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader("Retry-After", retryAfterSec.toString());
            throw new AppError(status.TOO_MANY_REQUESTS, message);
        }

        next();
    };
};

// Specialized auth limiters
export const authRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // max 20 requests per 15 min per IP
    message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
});

export const otpRateLimiter = rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // max 5 OTP requests per 5 minutes
    message: "Too many OTP requests. Please wait 5 minutes before trying again.",
});
