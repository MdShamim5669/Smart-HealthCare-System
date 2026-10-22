import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { initAppointmentCron, stopAppointmentCron } from "./app/cron";
import { prisma } from "./app/lib/prisma";

let server: Server;

async function bootstrap() {
    try {
        // Verify database connection
        await prisma.$connect();
        console.log("Database connected successfully via Prisma.");

        // Initialize background cron jobs
        initAppointmentCron();

        // Start listening
        server = app.listen(config.port, () => {
            console.log(`Server is running on http://localhost:${config.port}`);
            console.log(`Environment: ${config.env}`);
            console.log(`API Base: http://localhost:${config.port}/api/v1`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Graceful error handling
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception detected:", error);
    process.exit(1);
});

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Rejection detected:", error);
    if (server) {
        server.close(() => {
            stopAppointmentCron();
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

const handleGracefulShutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    stopAppointmentCron();
    if (server) {
        server.close(async () => {
            await prisma.$disconnect();
            console.log("Server closed and database disconnected.");
            process.exit(0);
        });
    } else {
        await prisma.$disconnect();
        process.exit(0);
    }
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));


bootstrap();
