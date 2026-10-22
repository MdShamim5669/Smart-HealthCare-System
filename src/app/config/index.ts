import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
    env: process.env.NODE_ENV || "development",
    port: process.env.PORT ? Number(process.env.PORT) : 5000,
    frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
    backend_url: process.env.BACKEND_URL || "http://localhost:5000",
    database_url: process.env.DATABASE_URL,
    better_auth: {
        secret: process.env.BETTER_AUTH_SECRET,
        url: process.env.BETTER_AUTH_URL || "http://localhost:5000",
        session_expires_in: Number(process.env.BETTER_AUTH_SESSION_TOKEN_EXPIRES_IN) || 86400,
        session_update_age: Number(process.env.BETTER_AUTH_SESSION_TOKEN_UPDATE_AGE) || 86400,
    },
    jwt: {
        access_token_secret: process.env.ACCESS_TOKEN_SECRET || "default_access_secret",
        refresh_token_secret: process.env.REFRESH_TOKEN_SECRET || "default_refresh_secret",
        access_token_expires_in: process.env.ACCESS_TOKEN_EXPIRES_IN || "1d",
        refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    },
    email: {
        smtp_user: process.env.EMAIL_SENDER_SMTP_USER,
        smtp_pass: process.env.EMAIL_SENDER_SMTP_PASS,
        smtp_host: process.env.EMAIL_SENDER_SMTP_HOST || "smtp.gmail.com",
        smtp_port: Number(process.env.EMAIL_SENDER_SMTP_PORT) || 587,
        from: process.env.EMAIL_SENDER_SMTP_FROM || "PH Healthcare <no-reply@phhealthcare.com>",
    },
    google: {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        callback_url: process.env.GOOGLE_CALLBACK_URL,
    },
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    },
    stripe: {
        secret_key: process.env.STRIPE_SECRET_KEY,
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    sslcommerz: {
        store_id: process.env.SSLCOMMERZ_STORE_ID,
        store_passwd: process.env.SSLCOMMERZ_STORE_PASSWD || process.env.SSLCOMMERZ_STORE_PASS,
        is_live: process.env.SSLCOMMERZ_IS_LIVE === "true",
    },
    seed: {
        super_admin_email: process.env.SUPER_ADMIN_EMAIL || "superadmin@phhealthcare.com",
        super_admin_password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdminPassword123!",
    },
};

