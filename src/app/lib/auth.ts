import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { dash } from "@better-auth/infra";
import config from "../config";
import { PasswordUtils } from "../utils/password";
import { prisma } from "./prisma";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        password: {
            hash: async (password: string) => PasswordUtils.hashPassword(password),
            verify: async ({ password, hash }: { password: string; hash: string }) =>
                PasswordUtils.verifyPassword(password, hash),
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "PATIENT",
                input: false, // Prevents privilege escalation during signup
            },
            status: {
                type: "string",
                required: false,
                defaultValue: "ACTIVE",
                input: false,
            },
            needPasswordChange: {
                type: "boolean",
                required: false,
                defaultValue: false,
                input: false,
            },
            isDeleted: {
                type: "boolean",
                required: false,
                defaultValue: false,
                input: false,
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // Auto-provision Patient profile when a user registers or logs in via OAuth
                    try {
                        const existingPatient = await prisma.patient.findUnique({
                            where: { email: user.email },
                        });
                        if (!existingPatient) {
                            await prisma.patient.create({
                                data: {
                                    name: user.name,
                                    email: user.email,
                                },
                            });
                        }
                    } catch (err) {
                        console.error("Error creating Patient profile in Better Auth hook:", err);
                    }
                },
            },
        },
    },
    socialProviders: {
        google: {
            clientId: config.google.client_id as string,
            clientSecret: config.google.client_secret as string,
            redirectURI:
                (config.google.callback_url as string) ||
                `${config.better_auth.url}/api/auth/callback/google`,
        },
    },
    session: {
        expiresIn: config.better_auth.session_expires_in || 60 * 60 * 24, // 1 day
        updateAge: config.better_auth.session_update_age || 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 24,
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
