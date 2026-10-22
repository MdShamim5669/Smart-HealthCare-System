import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth, validateRequest } from "../../middleware";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = Router();

router.post(
    "/initiate-payment",
    checkAuth(Role.PATIENT),
    validateRequest(PaymentValidation.initiatePaymentZodSchema),
    PaymentController.initiatePayment
);

router.get(
    "/my-payments",
    checkAuth(Role.PATIENT, Role.DOCTOR),
    PaymentController.getMyPayments
);

router.get(
    "/",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    PaymentController.getAllPayments
);

router.post(
    "/auto-cancel",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
    PaymentController.runAutoCancel
);

router.get(
    "/:id",
    checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
    PaymentController.getPaymentById
);

export const PaymentRoutes = router;
