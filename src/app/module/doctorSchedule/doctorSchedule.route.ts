import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DoctorScheduleController } from "./doctorSchedule.controller";
import { DoctorScheduleValidation } from "./doctorSchedule.validation";

const router = Router();

router.post(
    "/create-my-doctor-schedule",
    checkAuth(Role.DOCTOR),
    validateRequest(DoctorScheduleValidation.createDoctorScheduleZodSchema),
    DoctorScheduleController.createMyDoctorSchedule
);

router.get("/my-doctor-schedules", checkAuth(Role.DOCTOR), DoctorScheduleController.getMyDoctorSchedules);

router.delete("/delete-my-doctor-schedule/:id", checkAuth(Role.DOCTOR), DoctorScheduleController.deleteMyDoctorSchedule);

router.get("/", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), DoctorScheduleController.getAllDoctorSchedules);

export const DoctorScheduleRoutes = router;
