import crypto from "crypto";
import status from "http-status";
import { uuidv7 } from "uuidv7";
import { Role, UserStatus } from "../../../generated/prisma";
import config from "../../config";
import AppError from "../../errorHelpers/AppError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { EmailUtils } from "../../utils/email";
import { JwtUtils } from "../../utils/jwt";
import { PasswordUtils } from "../../utils/password";
import {
    IChangePasswordPayload,
    IForgetPasswordPayload,
    ILoginPayload,
    IRegisterPayload,
    IResetPasswordPayload,
    IVerifyEmailPayload,
} from "./auth.interface";

// 1. Patient Registration (sends 2-min email OTP)
const register = async (payload: IRegisterPayload) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: payload.email },
    });

    if (existingUser && !existingUser.isDeleted && existingUser.status === UserStatus.ACTIVE) {
        throw new AppError(status.CONFLICT, "A user with this email is already registered and verified");
    }

    const hashedPassword = PasswordUtils.hashPassword(payload.password);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes expiry

    await prisma.$transaction(async (tx) => {
        let user = existingUser;

        if (!user) {
            user = await tx.user.create({
                data: {
                    name: payload.name,
                    email: payload.email,
                    role: Role.PATIENT,
                    status: UserStatus.INACTIVE, // Inactive until email verified
                },
            });

            await tx.patient.create({
                data: {
                    name: payload.name,
                    email: payload.email,
                },
            });

            await tx.account.create({
                data: {
                    userId: user.id,
                    accountId: user.id,
                    providerId: "credential",
                    password: hashedPassword,
                },
            });
        } else {
            // Update password for unverified re-registration
            await tx.account.updateMany({
                where: { userId: user.id, providerId: "credential" },
                data: { password: hashedPassword },
            });
        }

        // Store OTP in Verification table
        await tx.verification.deleteMany({
            where: { identifier: payload.email },
        });

        await tx.verification.create({
            data: {
                identifier: payload.email,
                value: otp,
                expiresAt,
            },
        });
    });

    // Send email with 2-minute OTP
    await EmailUtils.sendOtpEmail(payload.email, otp);

    return {
        message: "Registration successful. Please verify the 6-digit OTP sent to your email (expires in 2 minutes).",
    };
};

// 2. Email OTP Verification
const verifyEmail = async (payload: IVerifyEmailPayload) => {
    const verification = await prisma.verification.findFirst({
        where: {
            identifier: payload.email,
            value: payload.otp,
            expiresAt: { gt: new Date() },
        },
    });

    if (!verification) {
        throw new AppError(status.BAD_REQUEST, "Invalid or expired OTP. Please request a new code.");
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { email: payload.email },
            data: { status: UserStatus.ACTIVE },
        });

        await tx.verification.delete({
            where: { id: verification.id },
        });
    });

    return {
        message: "Email successfully verified. You can now log in.",
    };
};

// 3. Login
const login = async (payload: ILoginPayload) => {
    const user = await prisma.user.findUnique({
        where: { email: payload.email },
        include: { accounts: true },
    });

    if (!user || user.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User does not exist");
    }

    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.DELETED) {
        throw new AppError(status.FORBIDDEN, "Your account is blocked or deactivated");
    }

    if (user.status === UserStatus.INACTIVE) {
        throw new AppError(status.UNAUTHORIZED, "Email not verified. Please verify your email first.");
    }

    const credentialAccount = user.accounts.find((a) => a.providerId === "credential" && a.password);

    if (!credentialAccount || !credentialAccount.password) {
        throw new AppError(status.BAD_REQUEST, "No password set for this account. Try Google login.");
    }

    const isPasswordValid = PasswordUtils.verifyPassword(payload.password, credentialAccount.password);

    if (!isPasswordValid) {
        throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
    }

    // 1 Day Session for Better Auth
    const sessionToken = String(uuidv7());
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    await prisma.session.create({
        data: {
            userId: user.id,
            token: sessionToken,
            expiresAt: sessionExpiresAt,
        },
    });

    // Generate JWT access token (1 day) and refresh token (7 days)
    const tokenPayload = {
        userId: user.id,
        role: user.role,
        email: user.email,
    };

    const accessToken = JwtUtils.generateToken(tokenPayload, config.jwt.access_token_secret, config.jwt.access_token_expires_in);
    const refreshToken = JwtUtils.generateToken(tokenPayload, config.jwt.refresh_token_secret, config.jwt.refresh_token_expires_in);

    return {
        sessionToken,
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            needPasswordChange: user.needPasswordChange,
        },
    };
};

// 4. Get Current Logged-in User
const getMe = async (user: IRequestUser) => {
    const userData = await prisma.user.findUnique({
        where: { email: user.email },
        include: {
            admin: true,
            doctor: {
                include: {
                    doctorSpecialties: {
                        include: { specialties: true },
                    },
                },
            },
            patient: {
                include: {
                    patientHealthData: true,
                },
            },
        },
    });

    if (!userData || userData.isDeleted) {
        throw new AppError(status.NOT_FOUND, "User profile not found");
    }

    return userData;
};

// 5. Refresh Tokens & Extend Session
const refreshToken = async (incomingRefreshToken: string, incomingSessionToken?: string) => {
    const verified = JwtUtils.verifyToken(incomingRefreshToken, config.jwt.refresh_token_secret);

    const user = await prisma.user.findUnique({
        where: { id: verified.userId },
    });

    if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
        throw new AppError(status.UNAUTHORIZED, "User account is invalid or no longer active");
    }

    // Extend session lifetime if session token exists
    if (incomingSessionToken) {
        const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await prisma.session.updateMany({
            where: { token: incomingSessionToken },
            data: { expiresAt: newExpiresAt },
        });
    }

    const tokenPayload = {
        userId: user.id,
        role: user.role,
        email: user.email,
    };

    const newAccessToken = JwtUtils.generateToken(tokenPayload, config.jwt.access_token_secret, config.jwt.access_token_expires_in);
    const newRefreshToken = JwtUtils.generateToken(tokenPayload, config.jwt.refresh_token_secret, config.jwt.refresh_token_expires_in);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
};

// 6. Change Password
const changePassword = async (payload: IChangePasswordPayload, user: IRequestUser) => {
    const account = await prisma.account.findFirst({
        where: { userId: user.userId, providerId: "credential" },
    });

    if (!account || !account.password) {
        throw new AppError(status.BAD_REQUEST, "Account does not have a local password to change");
    }

    const isValid = PasswordUtils.verifyPassword(payload.oldPassword, account.password);

    if (!isValid) {
        throw new AppError(status.UNAUTHORIZED, "Incorrect old password");
    }

    const newHashedPassword = PasswordUtils.hashPassword(payload.newPassword);

    await prisma.account.update({
        where: { id: account.id },
        data: { password: newHashedPassword },
    });

    return { message: "Password updated successfully" };
};

// 7. Forget Password (sends reset email)
const forgetPassword = async (payload: IForgetPasswordPayload) => {
    const user = await prisma.user.findUnique({
        where: { email: payload.email },
    });

    if (!user || user.isDeleted) {
        // Return friendly message without disclosing user existence
        return { message: "If that email exists in our system, a password reset link has been sent." };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.verification.deleteMany({
        where: { identifier: `reset:${payload.email}` },
    });

    await prisma.verification.create({
        data: {
            identifier: `reset:${payload.email}`,
            value: resetToken,
            expiresAt,
        },
    });

    const resetLink = `${config.frontend_url}/reset-password?token=${resetToken}&email=${encodeURIComponent(payload.email)}`;

    await EmailUtils.sendResetPasswordEmail(payload.email, resetLink);

    return { message: "Password reset link sent to your email." };
};

// 8. Reset Password
const resetPassword = async (payload: IResetPasswordPayload) => {
    const verification = await prisma.verification.findFirst({
        where: {
            value: payload.token,
            expiresAt: { gt: new Date() },
        },
    });

    if (!verification) {
        throw new AppError(status.BAD_REQUEST, "Invalid or expired reset token.");
    }

    const email = verification.identifier.replace("reset:", "");
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found.");
    }

    const newHashedPassword = PasswordUtils.hashPassword(payload.newPassword);

    await prisma.$transaction(async (tx) => {
        await tx.account.updateMany({
            where: { userId: user.id, providerId: "credential" },
            data: { password: newHashedPassword },
        });

        await tx.verification.delete({
            where: { id: verification.id },
        });
    });

    return { message: "Password reset successfully. You can now login with your new password." };
};

// 9. Logout
const logout = async (sessionToken?: string) => {
    if (sessionToken) {
        await prisma.session.deleteMany({
            where: { token: sessionToken },
        });
    }
    return { message: "Logged out successfully" };
};

export const AuthService = {
    register,
    verifyEmail,
    login,
    getMe,
    refreshToken,
    changePassword,
    forgetPassword,
    resetPassword,
    logout,
};
