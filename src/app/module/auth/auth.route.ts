import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { authRateLimiter, otpRateLimiter } from "../../middleware/rateLimiter";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

// Registration & Verification
router.post(
    "/register",
    authRateLimiter,
    validateRequest(AuthValidation.registerZodSchema),
    AuthController.register
);

router.post(
    "/verify-email",
    otpRateLimiter,
    validateRequest(AuthValidation.verifyEmailZodSchema),
    AuthController.verifyEmail
);

router.post(
    "/resend-otp",
    otpRateLimiter,
    validateRequest(AuthValidation.resendOtpZodSchema),
    AuthController.resendOtp
);

// Login & User Profile
router.post(
    "/login",
    authRateLimiter,
    validateRequest(AuthValidation.loginZodSchema),
    AuthController.login
);

router.get("/me", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), AuthController.getMe);

// Google OAuth Compatibility Endpoint
router.get("/google/callback", AuthController.googleCallback);

// Token Refresh
router.post("/refresh-token", AuthController.refreshToken);

// Password Management
router.post(
    "/change-password",
    checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
    validateRequest(AuthValidation.changePasswordZodSchema),
    AuthController.changePassword
);

router.post(
    "/forget-password",
    authRateLimiter,
    validateRequest(AuthValidation.forgetPasswordZodSchema),
    AuthController.forgetPassword
);

router.post(
    "/reset-password",
    authRateLimiter,
    validateRequest(AuthValidation.resetPasswordZodSchema),
    AuthController.resetPassword
);

// Logout
router.post("/logout", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), AuthController.logout);

export const AuthRoutes = router;

