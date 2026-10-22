import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post("/register", validateRequest(AuthValidation.registerZodSchema), AuthController.register);

router.post("/verify-email", validateRequest(AuthValidation.verifyEmailZodSchema), AuthController.verifyEmail);

router.post("/login", validateRequest(AuthValidation.loginZodSchema), AuthController.login);

router.get("/me", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), AuthController.getMe);

router.post("/refresh-token", AuthController.refreshToken);

router.post(
    "/change-password",
    checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
    validateRequest(AuthValidation.changePasswordZodSchema),
    AuthController.changePassword
);

router.post("/forget-password", validateRequest(AuthValidation.forgetPasswordZodSchema), AuthController.forgetPassword);

router.post("/reset-password", validateRequest(AuthValidation.resetPasswordZodSchema), AuthController.resetPassword);

router.post("/logout", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), AuthController.logout);

export const AuthRoutes = router;
