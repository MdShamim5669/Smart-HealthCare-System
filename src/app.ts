import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import config from "./app/config";
import { globalErrorHandler, notFound } from "./app/middleware";
import { IndexRoutes } from "./app/routes";


const app: Application = express();

// Stripe Webhook needs the raw payload for signature verification
app.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    (req: Request, res: Response) => {
        // Stripe webhook handler will process here
        res.status(200).json({ received: true });
    }
);

// Standard Middlewares
app.use(
    cors({
        origin: [config.frontend_url, "http://localhost:3000"],
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
