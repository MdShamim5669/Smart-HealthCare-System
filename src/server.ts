import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { initAppointmentCron } from "./app/cron/appointmentCron";
import { prisma } from "./app/lib/prisma";


let server: Server;

async function bootstrap() {
    try {
        // Verify database connection
        await prisma.$connect();
        console.log("Database connected successfully via Prisma.");

        // Initialize background cron jobs
        initAppointmentCron();
        console.log("Background cron job initialized (unpaid appointment auto-cancellation every 25 mins).");

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
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

process.on("SIGTERM", async () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    if (server) {
        server.close(async () => {
            await prisma.$disconnect();
            console.log("Server closed and database disconnected.");
            process.exit(0);
        });
    }
});

bootstrap();
