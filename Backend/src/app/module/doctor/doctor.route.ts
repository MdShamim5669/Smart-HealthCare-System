import { Router } from "express";
import { Role } from "../../../generated/prisma";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DoctorController } from "./doctor.controller";
import { DoctorValidation } from "./doctor.validation";

const router = Router();

router.get("/", DoctorController.getAllDoctors);

router.get("/:id", DoctorController.getDoctorById);

router.patch(
    "/:id",
    checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR),
    validateRequest(DoctorValidation.updateDoctorZodSchema),
    DoctorController.updateDoctor
);

router.delete("/:id", checkAuth(Role.ADMIN, Role.SUPER_ADMIN), DoctorController.deleteDoctor);

export const DoctorRoutes = router;
