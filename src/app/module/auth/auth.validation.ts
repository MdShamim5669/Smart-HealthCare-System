import z from "zod";

const registerZodSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginZodSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

const verifyEmailZodSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z.string().length(6, "OTP must be exactly 6 characters"),
});

const changePasswordZodSchema = z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const forgetPasswordZodSchema = z.object({
    email: z.string().email("Invalid email address"),
});

const resetPasswordZodSchema = z.object({
    token: z.string({ message: "Reset token is required" }),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const resendOtpZodSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const AuthValidation = {
    registerZodSchema,
    loginZodSchema,
    verifyEmailZodSchema,
    resendOtpZodSchema,
    changePasswordZodSchema,
    forgetPasswordZodSchema,
    resetPasswordZodSchema,
};
