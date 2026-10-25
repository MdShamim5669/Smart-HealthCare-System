import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import config from "./app/config";
import { auth } from "./app/lib/auth";
import { globalErrorHandler, notFound } from "./app/middleware";
import { PaymentController } from "./app/module/payment/payment.controller";
import { IndexRoutes } from "./app/routes";

const app: Application = express();

// Security: Disable X-Powered-By header
app.disable("x-powered-by");

// Stripe Webhook needs the raw payload for signature verification
app.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    PaymentController.handleStripeWebhook
);

// Standard Middlewares
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (
                origin.includes("localhost") ||
                origin.includes("better-auth.com") ||
                origin.includes("trycloudflare.com") ||
                origin === config.frontend_url
            ) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "Cookie", "x-session-token"],
        exposedHeaders: ["X-Session-Refresh", "X-Session-Expires-At", "X-Time-Remaining"],
    })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Better Auth API Route
app.all("/api/auth/*splat", toNodeHandler(auth));
app.all("/api/auth", toNodeHandler(auth));

// Root welcome route
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Welcome to Smart HealthCare Backend API",
        version: "1.0.0",
        docs: "/api/v1/health",
    });
});

// Application API Routes
app.use("/api/v1", IndexRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(globalErrorHandler);

export default app;
