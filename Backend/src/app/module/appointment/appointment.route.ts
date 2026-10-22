import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AppointmentController } from "./appointment.controller";
import { AppointmentValidation } from "./appointment.validation";

const router = Router();

router.post(
    "/book-appointment",
    checkAuth(Role.PATIENT),
    validateRequest(AppointmentValidation.bookAppointmentZodSchema),
    AppointmentController.bookAppointment
);

router.post(
    "/book-appointment-with-pay-later",
    checkAuth(Role.PATIENT),
    validateRequest(AppointmentValidation.bookAppointmentZodSchema),
    AppointmentController.bookAppointmentWithPayLater
);

router.post("/initiate-payment/:id", checkAuth(Role.PATIENT), AppointmentController.initiatePayment);

router.get("/my-appointments", checkAuth(Role.PATIENT, Role.DOCTOR), AppointmentController.getMyAppointments);

router.get("/my-single-appointment/:id", checkAuth(Role.PATIENT, Role.DOCTOR), AppointmentController.getMySingleAppointment);

router.get("/all-appointments", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), AppointmentController.getAllAppointments);

router.patch(
    "/change-appointment-status/:id",
    checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
    validateRequest(AppointmentValidation.changeAppointmentStatusZodSchema),
    AppointmentController.changeAppointmentStatus
);

export const AppointmentRoutes = router;
