import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { dash } from "@better-auth/infra";
import config from "../config";
import { prisma } from "./prisma";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: config.google.client_id as string,
            clientSecret: config.google.client_secret as string,
            redirectURI: config.google.callback_url as string,
        },
    },
    session: {
        expiresIn: 60 * 60 * 24, // 1 day in seconds
        updateAge: 60 * 60 * 24, // 1 day in seconds
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 24, // 1 day in seconds
        },
    },
    secret: config.better_auth.secret,
    baseURL: config.better_auth.url,
    trustedOrigins: [
        config.frontend_url,
        "http://localhost:3000",
        "http://localhost:5000",
        "https://*.trycloudflare.com",
        "https://better-auth.com",
        "https://dash.better-auth.com",
    ],
    plugins: [
        dash({
            apiKey: config.better_auth.api_key || process.env.BETTER_AUTH_API_KEY || "ba_54ghgd6253oa9ca1qkban5d0f29d5oxq",
        }),
    ],
});
